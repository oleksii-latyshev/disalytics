use crate::error::ParseError;
use ahash::AHashMap;
use parser::first_pass::parser_settings::ParserInputs;
use parser::first_pass::read_bits::DemoParserError;
use parser::parse_demo::{Parser, ParsingMode};
use parser::second_pass::parser_settings::create_huffman_lookup_table;

/// `docs/PARSER.md` §7 measured the two threading modes producing *different* event sets, and §3
/// rejects the `SharedArrayBuffer` a browser would need for threads anyway. Pinning the mode for
/// every target rather than for `wasm32` alone is what makes a host `cargo test` see what a browser
/// sees; hard rule 8 holds because of this line, not because upstream offers it.
const PARSING_MODE: ParsingMode = ParsingMode::ForceSingleThreaded;

/// Mirrors `parser::parse_demo::HEADER_ENDS_AT_BYTE`, which upstream does not re-export.
const HEADER_BYTES: usize = 16;

/// The distinct game-event names a demo contains, sorted.
///
/// Sorting is not cosmetic. Upstream hands these back in an `AHashSet`, and iteration order of a
/// hash set is exactly the non-determinism `CODE_REQUIREMENTS.md` §3 rules out for parsed output.
///
/// # Errors
///
/// Returns the [`ParseError`] the file earned: an unreadable file is an expected outcome here, not
/// a programmer error.
pub fn event_names(demo_bytes: &[u8]) -> Result<Vec<String>, ParseError> {
    // Upstream slices `demo_bytes[..16]` one line before its own length check can fire, so a file
    // shorter than the header panics instead of erroring. `docs/PARSER.md` §8 records that an
    // aborted instance is poisoned for good, which turns that panic into a dead worker. The guard
    // lives here rather than in the vendored copy because never crashing is our contract.
    if demo_bytes.len() < HEADER_BYTES {
        return Err(ParseError::TruncatedDemo {
            read_bytes: demo_bytes.len(),
        });
    }

    let huffman_lookup_table = create_huffman_lookup_table();
    let inputs = ParserInputs {
        real_name_to_og_name: AHashMap::default(),
        wanted_players: vec![],
        wanted_player_props: vec![],
        wanted_other_props: vec![],
        wanted_prop_states: AHashMap::default(),
        wanted_ticks: vec![],
        wanted_events: vec!["all".to_owned()],
        parse_ents: true,
        parse_projectiles: false,
        parse_grenades: false,
        only_header: false,
        only_convars: false,
        huffman_lookup_table: &huffman_lookup_table,
        order_by_steamid: false,
        list_props: false,
        fallback_bytes: None,
    };

    let output = Parser::new(inputs, PARSING_MODE)
        .parse_demo(demo_bytes)
        .map_err(|error| translate(&error, demo_bytes))?;

    let mut names: Vec<String> = output.game_events_counter.into_iter().collect();
    names.sort_unstable();

    Ok(names)
}

fn translate(error: &DemoParserError, demo_bytes: &[u8]) -> ParseError {
    match error {
        DemoParserError::UnknownFile => ParseError::NotADemo,
        DemoParserError::Source1DemoError => source_1_protocol(demo_bytes)
            .map_or(ParseError::NotADemo, |protocol| {
                ParseError::UnsupportedDemoVersion { protocol }
            }),
        DemoParserError::OutOfBytesError
        | DemoParserError::OutOfBitsError
        | DemoParserError::DemoEndsEarly(_) => ParseError::TruncatedDemo {
            read_bytes: demo_bytes.len(),
        },
        other => ParseError::MalformedDemo {
            detail: format!("{other:?}"),
        },
    }
}

// A Source 1 demo header is an 8-byte magic followed by `demoprotocol` as a little-endian i32.
// Upstream rejects the file on the magic alone and never reads the number, so the message that
// names the version has to read it here.
fn source_1_protocol(demo_bytes: &[u8]) -> Option<u32> {
    demo_bytes
        .get(8..12)
        .and_then(|field| <[u8; 4]>::try_from(field).ok())
        .map(u32::from_le_bytes)
}

#[cfg(test)]
mod tests {
    use super::event_names;
    use crate::error::{ErrorCode, ParseError};

    fn demo_with_magic(magic: &[u8]) -> Vec<u8> {
        let mut bytes = magic.to_vec();
        bytes.extend_from_slice(&4_u32.to_le_bytes());
        bytes.resize(64, 0);
        bytes
    }

    #[test]
    fn a_file_that_is_not_a_demo_is_named_as_one() {
        let error = event_names(&demo_with_magic(b"NOTADEM\0")).unwrap_err();

        assert_eq!(error.code(), ErrorCode::NotADemo);
    }

    #[test]
    fn a_source_1_demo_reports_the_protocol_upstream_refused_to_read() {
        let error = event_names(&demo_with_magic(b"HL2DEMO\0")).unwrap_err();

        assert_eq!(error, ParseError::UnsupportedDemoVersion { protocol: 4 });
    }

    #[test]
    fn a_file_too_short_to_hold_a_header_is_truncated_rather_than_a_panic() {
        let error = event_names(b"PBDEMS2\0").unwrap_err();

        assert_eq!(error.code(), ErrorCode::TruncatedDemo);
    }

    #[test]
    fn an_empty_file_is_truncated() {
        let error = event_names(&[]).unwrap_err();

        assert_eq!(error, ParseError::TruncatedDemo { read_bytes: 0 });
    }

    #[test]
    fn source_2_magic_over_noise_fails_without_unwinding_into_a_panic() {
        let error = event_names(&demo_with_magic(b"PBDEMS2\0")).unwrap_err();

        assert_ne!(error.code(), ErrorCode::NotADemo);
    }
}
