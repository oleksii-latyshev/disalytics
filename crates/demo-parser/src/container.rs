use crate::error::ParseError;
use bzip2::read::MultiBzDecoder;
use ruzstd::decoding::StreamingDecoder;
use std::borrow::Cow;
use std::io::Read;

/// Containers are told apart by their magic bytes and never by the file's extension, so a demo that
/// was renamed on the way to disk still opens — `AGENTS.md` §7.1.
const ZSTD_MAGIC: [u8; 4] = [0x28, 0xb5, 0x2f, 0xfd];
const BZIP2_MAGIC: [u8; 3] = *b"BZh";
const GZIP_MAGIC: [u8; 2] = [0x1f, 0x8b];

/// A compressed stream declares how far it expands and a hostile one can lie by orders of
/// magnitude. `wasm32` aborts the instance on a failed allocation rather than returning, so the
/// claim has to be refused before it is believed. A 40-minute match expands to roughly 350 MB, and
/// anything past this ceiling cannot fit the peak-memory budget in `AGENTS.md` §16 either way.
const MAX_DECOMPRESSED_BYTES: usize = 1536 * 1024 * 1024;

const READ_CHUNK_BYTES: usize = 64 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Codec {
    Zstd,
    Bzip2,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Container {
    Raw,
    Compressed(Codec),
}

/// Whether the file needs expanding before it is a demo, which is what lets a caller name the phase
/// it is reporting without knowing the magic bytes itself.
#[must_use]
pub fn is_compressed(file_bytes: &[u8]) -> bool {
    matches!(identify(file_bytes), Ok(Container::Compressed(_)))
}

/// The demo's bytes, borrowed when the file already held them.
pub(crate) fn decompressed(file_bytes: &[u8]) -> Result<Cow<'_, [u8]>, ParseError> {
    match identify(file_bytes)? {
        Container::Raw => Ok(Cow::Borrowed(file_bytes)),
        Container::Compressed(codec) => Ok(Cow::Owned(expand(
            codec,
            file_bytes,
            MAX_DECOMPRESSED_BYTES,
        )?)),
    }
}

/// [`decompressed`], releasing the compressed file as it returns.
///
/// The two copies of a `.dem.zst` exist at once only while it is being expanded. That is the
/// difference between a transient 617 MB and carrying the compressed quarter-gigabyte through all
/// three passes, and `AGENTS.md` §16 is what it buys.
pub(crate) fn decompressed_owned(file_bytes: Vec<u8>) -> Result<Vec<u8>, ParseError> {
    match identify(&file_bytes)? {
        Container::Raw => Ok(file_bytes),
        Container::Compressed(codec) => expand(codec, &file_bytes, MAX_DECOMPRESSED_BYTES),
    }
}

fn identify(file_bytes: &[u8]) -> Result<Container, ParseError> {
    if file_bytes.starts_with(&ZSTD_MAGIC) {
        return Ok(Container::Compressed(Codec::Zstd));
    }

    if is_bzip2(file_bytes) {
        return Ok(Container::Compressed(Codec::Bzip2));
    }

    if file_bytes.starts_with(&GZIP_MAGIC) {
        return Err(ParseError::UnsupportedContainer);
    }

    Ok(Container::Raw)
}

// `BZh` is followed by the block-size digit the format requires. Reading it is what tells a bzip2
// header apart from a file that merely opens with those three characters.
fn is_bzip2(file_bytes: &[u8]) -> bool {
    file_bytes.starts_with(&BZIP2_MAGIC)
        && file_bytes
            .get(BZIP2_MAGIC.len())
            .is_some_and(|digit| digit.is_ascii_digit() && *digit != b'0')
}

fn expand(codec: Codec, file_bytes: &[u8], limit: usize) -> Result<Vec<u8>, ParseError> {
    let mut demo_bytes = Vec::new();

    match codec {
        Codec::Zstd => expand_zstd(file_bytes, &mut demo_bytes, limit)?,
        Codec::Bzip2 => read_into(MultiBzDecoder::new(file_bytes), &mut demo_bytes, limit)?,
    }

    Ok(demo_bytes)
}

/// `ruzstd`'s streaming decoder stops at the end of one frame, and the format allows an archive to
/// hold several. Handing back the first frame alone would look like a demo that ends early, so the
/// loop is what makes a concatenated archive read as the whole file it is.
fn expand_zstd(
    file_bytes: &[u8],
    demo_bytes: &mut Vec<u8>,
    limit: usize,
) -> Result<(), ParseError> {
    let mut source = file_bytes;

    while !source.is_empty() {
        let mut frame =
            StreamingDecoder::new(&mut source).map_err(|_| decoding_failed(demo_bytes.len()))?;

        reserve(demo_bytes, frame.decoder.content_size(), limit)?;
        read_into(&mut frame, demo_bytes, limit)?;
    }

    Ok(())
}

/// Takes the frame at its word about how far it expands, once that claim is under `limit`. Growing
/// a quarter-gigabyte buffer by doubling would hold the old and new allocations at once, which is a
/// larger spike than the demo itself.
fn reserve(demo_bytes: &mut Vec<u8>, declared: u64, limit: usize) -> Result<(), ParseError> {
    let Ok(declared) = usize::try_from(declared) else {
        return Err(over_limit(limit));
    };

    if declared == 0 {
        return Ok(());
    }

    if demo_bytes.len().saturating_add(declared) > limit {
        return Err(over_limit(limit));
    }

    demo_bytes
        .try_reserve(declared)
        .map_err(|_| unallocatable())
}

fn read_into(
    mut decoder: impl Read,
    demo_bytes: &mut Vec<u8>,
    limit: usize,
) -> Result<(), ParseError> {
    let mut chunk = vec![0_u8; READ_CHUNK_BYTES];

    loop {
        let read = decoder
            .read(&mut chunk)
            .map_err(|_| decoding_failed(demo_bytes.len()))?;

        if read == 0 {
            return Ok(());
        }

        if demo_bytes.len().saturating_add(read) > limit {
            return Err(over_limit(limit));
        }

        demo_bytes.try_reserve(read).map_err(|_| unallocatable())?;
        demo_bytes.extend_from_slice(&chunk[..read]);
    }
}

/// A decoder cannot say whether a stream that stops decoding was cut short or corrupted, and a
/// download that stopped early is much the commoner of the two. The alternative code claims the
/// file is a Counter-Strike 2 demo whose recording is damaged, which is a claim nothing has earned
/// at this point — the container has not been opened, so what is inside it is still unknown.
fn decoding_failed(decompressed_bytes: usize) -> ParseError {
    ParseError::TruncatedDemo {
        read_bytes: decompressed_bytes,
    }
}

fn over_limit(limit: usize) -> ParseError {
    ParseError::MalformedDemo {
        detail: format!("the container expands past the {limit}-byte ceiling"),
    }
}

fn unallocatable() -> ParseError {
    ParseError::MalformedDemo {
        detail: "the decompressed demo does not fit in memory".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        Codec, Container, MAX_DECOMPRESSED_BYTES, decompressed, decompressed_owned, expand,
        identify, is_compressed,
    };
    use crate::error::{ErrorCode, ParseError};
    use bzip2::Compression;
    use bzip2::write::BzEncoder;
    use std::io::Write;

    const DEMO: &[u8] = b"PBDEMS2\0the bytes a parser would be handed";

    fn zstd(bytes: &[u8]) -> Vec<u8> {
        ruzstd::encoding::compress_to_vec(bytes, ruzstd::encoding::CompressionLevel::Fastest)
    }

    fn bzip2(bytes: &[u8]) -> Vec<u8> {
        let mut encoder = BzEncoder::new(Vec::new(), Compression::fast());
        encoder
            .write_all(bytes)
            .expect("the encoder rejected the input");

        encoder.finish().expect("the encoder produced no stream")
    }

    #[test]
    fn a_raw_demo_is_recognised_and_never_copied() {
        assert_eq!(identify(DEMO), Ok(Container::Raw));
        assert!(!is_compressed(DEMO));

        let borrowed = decompressed(DEMO).expect("a raw demo failed to pass through");

        assert!(matches!(borrowed, std::borrow::Cow::Borrowed(_)));
        assert_eq!(borrowed.as_ref(), DEMO);
    }

    #[test]
    fn each_container_is_identified_by_its_magic_bytes() {
        assert_eq!(
            identify(&zstd(DEMO)),
            Ok(Container::Compressed(Codec::Zstd))
        );
        assert_eq!(
            identify(&bzip2(DEMO)),
            Ok(Container::Compressed(Codec::Bzip2))
        );
        assert!(is_compressed(&zstd(DEMO)));
        assert!(is_compressed(&bzip2(DEMO)));
    }

    #[test]
    fn a_zstd_container_expands_to_the_demo_inside_it() {
        assert_eq!(
            decompressed(&zstd(DEMO))
                .expect("a zstd container failed")
                .as_ref(),
            DEMO
        );
    }

    #[test]
    fn a_bzip2_container_expands_to_the_demo_inside_it() {
        assert_eq!(
            decompressed(&bzip2(DEMO))
                .expect("a bzip2 container failed")
                .as_ref(),
            DEMO
        );
    }

    #[test]
    fn a_zstd_archive_of_several_frames_expands_to_all_of_them() {
        let mut archive = zstd(b"first half of the demo, ");
        archive.extend_from_slice(&zstd(b"and the second"));

        assert_eq!(
            decompressed(&archive)
                .expect("a multi-frame archive failed")
                .as_ref(),
            b"first half of the demo, and the second"
        );
    }

    #[test]
    fn expanding_an_owned_file_hands_a_raw_demo_straight_back() {
        let owned = decompressed_owned(DEMO.to_vec()).expect("a raw demo failed to pass through");

        assert_eq!(owned, DEMO);
        assert_eq!(
            decompressed_owned(zstd(DEMO)).expect("a zstd container failed"),
            DEMO
        );
    }

    #[test]
    fn a_gzip_container_is_named_as_unsupported_rather_than_as_rubbish() {
        let gzipped = [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00];

        assert_eq!(identify(&gzipped), Err(ParseError::UnsupportedContainer));
        assert_eq!(
            decompressed(&gzipped).unwrap_err().code(),
            ErrorCode::UnsupportedContainer
        );
    }

    #[test]
    fn three_familiar_characters_are_not_a_bzip2_header() {
        assert_eq!(identify(b"BZhang, not a container"), Ok(Container::Raw));
        assert_eq!(identify(b"BZh0"), Ok(Container::Raw));
    }

    #[test]
    fn a_file_too_short_to_carry_any_magic_is_raw() {
        assert_eq!(identify(&[]), Ok(Container::Raw));
        assert_eq!(identify(&[0x28, 0xb5]), Ok(Container::Raw));
    }

    #[test]
    fn a_zstd_stream_that_stops_early_is_reported_as_truncated() {
        let compressed = zstd(&DEMO.repeat(64));
        let cut = &compressed[..compressed.len() - 8];

        assert_eq!(
            decompressed(cut).unwrap_err().code(),
            ErrorCode::TruncatedDemo
        );
    }

    #[test]
    fn a_bzip2_stream_that_stops_early_is_reported_as_truncated() {
        let compressed = bzip2(&DEMO.repeat(64));
        let cut = &compressed[..compressed.len() - 8];

        assert_eq!(
            decompressed(cut).unwrap_err().code(),
            ErrorCode::TruncatedDemo
        );
    }

    #[test]
    fn a_container_holding_nothing_readable_is_not_called_a_damaged_demo() {
        let mut rubbish = super::ZSTD_MAGIC.to_vec();
        rubbish.extend_from_slice(&[0xff; 32]);

        assert_eq!(
            decompressed(&rubbish).unwrap_err().code(),
            ErrorCode::TruncatedDemo
        );
    }

    #[test]
    fn a_stream_that_expands_past_the_ceiling_is_refused_rather_than_allocated() {
        let bomb = zstd(&vec![0_u8; 4 * 1024 * 1024]);

        assert_eq!(
            expand(Codec::Zstd, &bomb, 1024).unwrap_err().code(),
            ErrorCode::MalformedDemo
        );
        assert!(expand(Codec::Zstd, &bomb, MAX_DECOMPRESSED_BYTES).is_ok());
    }
}
