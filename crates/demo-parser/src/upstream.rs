use crate::error::ParseError;
use ahash::AHashMap;
use parser::first_pass::parser_settings::ParserInputs;
use parser::first_pass::read_bits::DemoParserError;
use parser::parse_demo::{DemoOutput, Parser, ParsingMode};
use parser::second_pass::parser_settings::create_huffman_lookup_table;

/// `docs/PARSER.md` §7 measured the two threading modes producing *different* event sets, and §3
/// rejects the `SharedArrayBuffer` a browser would need for threads anyway. Pinning the mode for
/// every target rather than for `wasm32` alone is what makes a host `cargo test` see what a browser
/// sees; hard rule 8 holds because of this line, not because upstream offers it.
const PARSING_MODE: ParsingMode = ParsingMode::ForceSingleThreaded;

/// Mirrors `parser::parse_demo::HEADER_ENDS_AT_BYTE`, which upstream does not re-export.
const HEADER_BYTES: usize = 16;

/// `docs/PARSER.md` §3: upstream's `collect_entities` returns early for events and again for
/// projectiles, so one pass can carry exactly one of the three. Three is a floor, not a budget.
pub const PASS_COUNT: usize = 3;

pub(crate) const PASS_LABELS: [&str; PASS_COUNT] = ["events", "ticks", "projectiles"];

/// Real prop paths, never the friendly aliases `docs/PARSER.md` §5 measured being dropped in
/// silence. Changing this list changes parsed output and so requires a `SCHEMA_VERSION` bump.
///
/// The last two are upstream's *custom* props, which are a different thing from an alias: they have
/// no send-table path at all because upstream computes them by walking from the player to the
/// weapon entity. `active_weapon_name` is the trap — it is a name upstream maps only inside the
/// weapon table, so requesting it as a player prop yields no column and no error. The name that
/// resolves is `weapon_name`.
pub(crate) const TICK_PROPS: [&str; 20] = [
    prop::X,
    prop::Y,
    prop::Z,
    prop::YAW,
    prop::PITCH,
    prop::SPEED,
    prop::IS_ALIVE,
    prop::HEALTH,
    prop::TEAM,
    prop::IS_SCOPED,
    prop::IS_WALKING,
    prop::IS_DEFUSING,
    prop::IS_DUCKING,
    prop::FLASH_DURATION,
    prop::EQUIPMENT_VALUE,
    prop::MONEY,
    prop::ARMOUR,
    prop::HAS_HELMET,
    prop::ACTIVE_WEAPON,
    prop::INVENTORY_IDS,
];

pub(crate) mod prop {
    pub(crate) const X: &str = "X";
    pub(crate) const Y: &str = "Y";
    pub(crate) const Z: &str = "Z";
    pub(crate) const YAW: &str = "yaw";
    pub(crate) const PITCH: &str = "pitch";
    pub(crate) const SPEED: &str = "velocity";
    pub(crate) const IS_ALIVE: &str = "is_alive";
    pub(crate) const HEALTH: &str = "CCSPlayerPawn.m_iHealth";
    pub(crate) const TEAM: &str = "CCSPlayerPawn.m_iTeamNum";
    pub(crate) const IS_SCOPED: &str = "CCSPlayerPawn.m_bIsScoped";
    pub(crate) const IS_WALKING: &str = "CCSPlayerPawn.m_bIsWalking";
    pub(crate) const IS_DEFUSING: &str = "CCSPlayerPawn.m_bIsDefusing";
    pub(crate) const IS_DUCKING: &str = "CCSPlayerPawn.CCSPlayer_MovementServices.m_bDucking";
    pub(crate) const FLASH_DURATION: &str = "CCSPlayerPawn.m_flFlashDuration";
    pub(crate) const EQUIPMENT_VALUE: &str = "CCSPlayerPawn.m_unCurrentEquipmentValue";
    pub(crate) const MONEY: &str =
        "CCSPlayerController.CCSPlayerController_InGameMoneyServices.m_iAccount";
    pub(crate) const ARMOUR: &str = "CCSPlayerPawn.m_ArmorValue";
    pub(crate) const HAS_HELMET: &str = "CCSPlayerPawn.CCSPlayer_ItemServices.m_bHasHelmet";

    /// Upstream's custom props. See the note on `TICK_PROPS` before renaming either — the obvious
    /// name for the first one resolves to nothing.
    pub(crate) const ACTIVE_WEAPON: &str = "weapon_name";
    /// Item definition indices. The `inventory_as_bitmask` sibling looks cheaper and is wrong:
    /// upstream builds it as `1 << def_idx` and knife indices run to 526, so every knife above 63
    /// shifts out of the `u64`.
    pub(crate) const INVENTORY_IDS: &str = "inventory_as_ids";

    pub(crate) const TICK: &str = "tick";
    pub(crate) const STEAM_ID: &str = "steamid";
    pub(crate) const NAME: &str = "name";

    pub(crate) const GRENADE_ENTITY: &str = "grenade_entity_id";
    pub(crate) const GRENADE_TYPE: &str = "grenade_type";
    pub(crate) const GRENADE_X: &str = "x";
    pub(crate) const GRENADE_Y: &str = "y";
    pub(crate) const GRENADE_Z: &str = "z";
}

fn inputs(
    huffman_lookup_table: &Vec<(u8, u8)>,
    wanted_player_props: Vec<String>,
    wanted_events: Vec<String>,
    parse_projectiles: bool,
) -> ParserInputs<'_> {
    ParserInputs {
        real_name_to_og_name: AHashMap::default(),
        wanted_players: vec![],
        wanted_player_props,
        wanted_other_props: vec![],
        wanted_prop_states: AHashMap::default(),
        wanted_ticks: vec![],
        wanted_events,
        parse_ents: true,
        parse_projectiles,
        // `docs/PARSER.md` §5: with this set, the pass returns 2,921,567 rows whose coordinates are
        // all `None` instead of 301,488 rows with real ones. The flag that sounds like it enables
        // grenades is the one that breaks them.
        parse_grenades: false,
        only_header: false,
        only_convars: false,
        huffman_lookup_table,
        order_by_steamid: false,
        list_props: false,
        fallback_bytes: None,
    }
}

fn run(demo_bytes: &[u8], settings: ParserInputs<'_>) -> Result<DemoOutput, ParseError> {
    // Upstream slices `demo_bytes[..16]` one line before its own length check can fire, so a file
    // shorter than the header panics instead of erroring. `docs/PARSER.md` §8 records that an
    // aborted instance is poisoned for good, which turns that panic into a dead worker. The guard
    // lives here rather than in the vendored copy because never crashing is our contract.
    if demo_bytes.len() < HEADER_BYTES {
        return Err(ParseError::TruncatedDemo {
            read_bytes: demo_bytes.len(),
        });
    }

    Parser::new(settings, PARSING_MODE)
        .parse_demo(demo_bytes)
        .map_err(|error| translate(&error, demo_bytes))
}

fn owned(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_owned()).collect()
}

pub(crate) fn events_pass(demo_bytes: &[u8]) -> Result<DemoOutput, ParseError> {
    let huffman_lookup_table = create_huffman_lookup_table();
    run(
        demo_bytes,
        inputs(&huffman_lookup_table, vec![], owned(&["all"]), false),
    )
}

pub(crate) fn ticks_pass(demo_bytes: &[u8]) -> Result<DemoOutput, ParseError> {
    let huffman_lookup_table = create_huffman_lookup_table();
    run(
        demo_bytes,
        inputs(&huffman_lookup_table, owned(&TICK_PROPS), vec![], false),
    )
}

pub(crate) fn projectiles_pass(demo_bytes: &[u8]) -> Result<DemoOutput, ParseError> {
    let huffman_lookup_table = create_huffman_lookup_table();
    run(
        demo_bytes,
        inputs(&huffman_lookup_table, vec![], vec![], true),
    )
}

/// The distinct game-event names a demo contains, sorted.
///
/// Sorting is not cosmetic. Upstream hands these back in an `AHashSet`, and iteration order of a
/// hash set is exactly the non-determinism `CODE_REQUIREMENTS.md` §3 rules out for parsed output.
///
/// # Errors
///
/// Returns the [`ParseError`] the file earned: an unreadable file is an expected outcome here, not
/// a programmer error.
pub fn event_names(file_bytes: &[u8]) -> Result<Vec<String>, ParseError> {
    let output = events_pass(&crate::container::decompressed(file_bytes)?)?;
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
    use super::{PASS_COUNT, PASS_LABELS, TICK_PROPS, event_names};
    use crate::error::{ErrorCode, ParseError};
    use std::collections::BTreeSet;

    fn demo_with_magic(magic: &[u8]) -> Vec<u8> {
        let mut bytes = magic.to_vec();
        bytes.extend_from_slice(&4_u32.to_le_bytes());
        bytes.resize(64, 0);
        bytes
    }

    fn zstd(bytes: &[u8]) -> Vec<u8> {
        ruzstd::encoding::compress_to_vec(bytes, ruzstd::encoding::CompressionLevel::Fastest)
    }

    #[test]
    fn a_file_that_is_not_a_demo_is_named_as_one() {
        let error = event_names(&demo_with_magic(b"NOTADEM\0")).unwrap_err();

        assert_eq!(error.code(), ErrorCode::NotADemo);
    }

    /// The demo inside the container is what the error has to be about. Reaching a verdict that
    /// could only come from the bytes underneath is what proves the container was opened rather
    /// than guessed at from a file name nothing here ever sees.
    #[test]
    fn a_compressed_demo_is_judged_by_what_is_inside_the_container() {
        let error = event_names(&zstd(&demo_with_magic(b"HL2DEMO\0"))).unwrap_err();

        assert_eq!(error, ParseError::UnsupportedDemoVersion { protocol: 4 });
    }

    #[test]
    fn a_container_holding_something_that_is_not_a_demo_is_named_as_one() {
        let error = event_names(&zstd(&demo_with_magic(b"NOTADEM\0"))).unwrap_err();

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

    #[test]
    fn the_pass_plan_is_three_named_passes() {
        assert_eq!(PASS_COUNT, 3);
        assert_eq!(PASS_LABELS.len(), PASS_COUNT);
        assert_eq!(
            PASS_LABELS.iter().collect::<BTreeSet<_>>().len(),
            PASS_COUNT
        );
    }

    /// A friendly alias for a prop that *has* a send-table path is what `docs/PARSER.md` §5
    /// measured being dropped in silence. Upstream's custom props are the other thing — they have
    /// no path to alias, so they are named here individually rather than waved through by shape.
    #[test]
    fn no_requested_prop_is_a_friendly_alias() {
        let real_paths_or_custom_ids = |name: &&str| {
            name.contains('.')
                || [
                    "X",
                    "Y",
                    "Z",
                    "yaw",
                    "pitch",
                    "velocity",
                    "is_alive",
                    "weapon_name",
                    "inventory_as_ids",
                ]
                .contains(name)
        };

        assert!(TICK_PROPS.iter().all(real_paths_or_custom_ids));
    }

    #[test]
    fn the_requested_props_are_distinct() {
        assert_eq!(
            TICK_PROPS.iter().collect::<BTreeSet<_>>().len(),
            TICK_PROPS.len()
        );
    }
}
