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

/// The demo's bytes, borrowed when the file already held them. `on_consumed` hears how many of the
/// file's bytes the decoder has taken so far, and hears nothing for a raw demo.
pub(crate) fn decompressed<'f>(
    file_bytes: &'f [u8],
    on_consumed: &dyn Fn(usize),
) -> Result<Cow<'f, [u8]>, ParseError> {
    match identify(file_bytes)? {
        Container::Raw => Ok(Cow::Borrowed(file_bytes)),
        Container::Compressed(codec) => Ok(Cow::Owned(expand(
            codec,
            file_bytes,
            MAX_DECOMPRESSED_BYTES,
            on_consumed,
        )?)),
    }
}

/// [`decompressed`], releasing the compressed file as it returns.
///
/// The two copies of a `.dem.zst` exist at once only while it is being expanded. That is the
/// difference between a transient 617 MB and carrying the compressed quarter-gigabyte through both
/// passes, and `AGENTS.md` §16 is what it buys.
pub(crate) fn decompressed_owned(
    file_bytes: Vec<u8>,
    on_consumed: &dyn Fn(usize),
) -> Result<Vec<u8>, ParseError> {
    match identify(&file_bytes)? {
        Container::Raw => Ok(file_bytes),
        Container::Compressed(codec) => {
            expand(codec, &file_bytes, MAX_DECOMPRESSED_BYTES, on_consumed)
        }
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

/// The compressed bytes a decoder has taken. It is the one position both containers can report
/// honestly: a `.bz2` never says how far it expands, and a zstd frame is allowed not to.
struct Counted<'c, R> {
    source: R,
    bytes: usize,
    on_consumed: &'c dyn Fn(usize),
}

impl<R: Read> Read for Counted<'_, R> {
    fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
        let read = self.source.read(buffer)?;
        self.bytes += read;
        (self.on_consumed)(self.bytes);

        Ok(read)
    }
}

fn expand(
    codec: Codec,
    file_bytes: &[u8],
    limit: usize,
    on_consumed: &dyn Fn(usize),
) -> Result<Vec<u8>, ParseError> {
    let mut demo_bytes = Vec::new();
    let source = Counted {
        source: file_bytes,
        bytes: 0,
        on_consumed,
    };

    match codec {
        Codec::Zstd => expand_zstd(source, &mut demo_bytes, limit)?,
        Codec::Bzip2 => read_into(MultiBzDecoder::new(source), &mut demo_bytes, limit)?,
    }

    Ok(demo_bytes)
}

/// `ruzstd`'s streaming decoder stops at the end of one frame, and the format allows an archive to
/// hold several. Handing back the first frame alone would look like a demo that ends early, so the
/// loop is what makes a concatenated archive read as the whole file it is.
fn expand_zstd(
    mut source: Counted<'_, &[u8]>,
    demo_bytes: &mut Vec<u8>,
    limit: usize,
) -> Result<(), ParseError> {
    while !source.source.is_empty() {
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
        identify,
    };
    use crate::error::{ErrorCode, ParseError};
    use bzip2::Compression;
    use bzip2::write::BzEncoder;
    use std::cell::RefCell;
    use std::io::Write;

    const DEMO: &[u8] = b"PBDEMS2\0the bytes a parser would be handed";

    fn ignore(_consumed: usize) {}

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

        let borrowed = decompressed(DEMO, &ignore).expect("a raw demo failed to pass through");

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
    }

    #[test]
    fn a_zstd_container_expands_to_the_demo_inside_it() {
        assert_eq!(
            decompressed(&zstd(DEMO), &ignore)
                .expect("a zstd container failed")
                .as_ref(),
            DEMO
        );
    }

    #[test]
    fn a_bzip2_container_expands_to_the_demo_inside_it() {
        assert_eq!(
            decompressed(&bzip2(DEMO), &ignore)
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
            decompressed(&archive, &ignore)
                .expect("a multi-frame archive failed")
                .as_ref(),
            b"first half of the demo, and the second"
        );
    }

    #[test]
    fn each_container_reports_every_compressed_byte_it_consumes_and_never_goes_back() {
        for container in [zstd(&DEMO.repeat(512)), bzip2(&DEMO.repeat(512))] {
            let positions = RefCell::new(Vec::new());

            decompressed(&container, &|consumed| {
                positions.borrow_mut().push(consumed);
            })
            .expect("a container failed");

            let positions = positions.into_inner();
            assert!(positions.windows(2).all(|pair| pair[0] <= pair[1]));
            assert_eq!(positions.last(), Some(&container.len()));
        }
    }

    #[test]
    fn a_raw_demo_reports_no_decompression() {
        let reports = RefCell::new(0);

        decompressed(DEMO, &|_| *reports.borrow_mut() += 1).expect("a raw demo failed");

        assert_eq!(reports.into_inner(), 0);
    }

    #[test]
    fn expanding_an_owned_file_hands_a_raw_demo_straight_back() {
        let owned =
            decompressed_owned(DEMO.to_vec(), &ignore).expect("a raw demo failed to pass through");

        assert_eq!(owned, DEMO);
        assert_eq!(
            decompressed_owned(zstd(DEMO), &ignore).expect("a zstd container failed"),
            DEMO
        );
    }

    #[test]
    fn a_gzip_container_is_named_as_unsupported_rather_than_as_rubbish() {
        let gzipped = [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00];

        assert_eq!(identify(&gzipped), Err(ParseError::UnsupportedContainer));
        assert_eq!(
            decompressed(&gzipped, &ignore).unwrap_err().code(),
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
            decompressed(cut, &ignore).unwrap_err().code(),
            ErrorCode::TruncatedDemo
        );
    }

    #[test]
    fn a_bzip2_stream_that_stops_early_is_reported_as_truncated() {
        let compressed = bzip2(&DEMO.repeat(64));
        let cut = &compressed[..compressed.len() - 8];

        assert_eq!(
            decompressed(cut, &ignore).unwrap_err().code(),
            ErrorCode::TruncatedDemo
        );
    }

    #[test]
    fn a_container_holding_nothing_readable_is_not_called_a_damaged_demo() {
        let mut rubbish = super::ZSTD_MAGIC.to_vec();
        rubbish.extend_from_slice(&[0xff; 32]);

        assert_eq!(
            decompressed(&rubbish, &ignore).unwrap_err().code(),
            ErrorCode::TruncatedDemo
        );
    }

    #[test]
    fn a_stream_that_expands_past_the_ceiling_is_refused_rather_than_allocated() {
        let bomb = zstd(&vec![0_u8; 4 * 1024 * 1024]);

        assert_eq!(
            expand(Codec::Zstd, &bomb, 1024, &ignore)
                .unwrap_err()
                .code(),
            ErrorCode::MalformedDemo
        );
        assert!(expand(Codec::Zstd, &bomb, MAX_DECOMPRESSED_BYTES, &ignore).is_ok());
    }
}
