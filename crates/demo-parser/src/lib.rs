#![forbid(unsafe_code)]

mod columns;
mod error;
mod events;
mod fields;
mod grenades;
mod passes;
mod rounds;
mod schema;
mod ticks;
mod upstream;
mod vocabulary;

pub use error::{ErrorCode, ParseError};
pub use schema::{
    ANGLE_SCALE, Blind, BombDefuse, BombPlant, BuyType, DEFAULT_SAMPLE_HZ, Damage, DefuseOutcome,
    FLAG_ALIVE, FLAG_DEFUSING, FLAG_DUCKING, FLAG_PLANTING, FLAG_SCOPED, FLAG_WALKING, Grenade,
    GrenadeTrajectory, GrenadeType, HitGroup, Kill, MatchEvents, MatchHeader, ParsedDemo,
    PlayerEconomy, PlayerInfo, PlayerSlot, Round, RoundWinReason, Team, Tick, TickTrack,
    WorldPoint,
};
pub use upstream::{PASS_COUNT, event_names};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Parses a demo into the shape `packages/demo-core` describes.
///
/// # Errors
///
/// Returns the [`ParseError`] the file earned. A file that is not a demo, is truncated, or is a
/// Source 1 recording is an expected outcome here, not a programmer error.
pub fn parse(demo_bytes: &[u8]) -> Result<ParsedDemo, ParseError> {
    parse_recording_passes(demo_bytes).map(|(demo, _)| demo)
}

/// [`parse`], plus the passes it made over the demo. `docs/PARSER.md` §3 measured three as a floor
/// upstream imposes, and this is how that stays asserted rather than assumed.
///
/// # Errors
///
/// The same errors as [`parse`].
pub fn parse_recording_passes(
    demo_bytes: &[u8],
) -> Result<(ParsedDemo, Vec<&'static str>), ParseError> {
    let mut passes_made: Vec<&'static str> = Vec::with_capacity(PASS_COUNT);

    passes_made.push(upstream::PASS_LABELS[0]);
    let events_output = upstream::events_pass(demo_bytes)?;

    passes_made.push(upstream::PASS_LABELS[1]);
    let ticks_output = upstream::ticks_pass(demo_bytes)?;

    let table = ticks::Ticks::of(&ticks_output)?;
    let roster = table.roster();
    let passes = passes::Passes {
        events: &events_output,
        roster: &roster,
    };

    let tick_rate = ticks::TICK_RATE;
    let frames = rounds::frames(&passes);
    let samples = table.samples(&events::sampled_ticks(&passes, &frames), &roster);
    let track = table.track(&roster, &events::plant_windows(&passes), tick_rate);
    let header = MatchHeader {
        map: map_name(&events_output),
        tick_rate,
        players: players(&table, &roster),
    };
    let mut match_events = events::build(&passes, &frames, &samples);

    drop(table);
    drop(ticks_output);

    passes_made.push(upstream::PASS_LABELS[2]);
    let projectiles_output = upstream::projectiles_pass(demo_bytes)?;
    match_events.grenades = grenades::build(&projectiles_output, &passes, tick_rate)?;

    Ok((
        ParsedDemo {
            header,
            track,
            events: match_events,
        },
        passes_made,
    ))
}

fn map_name(output: &parser::parse_demo::DemoOutput) -> String {
    output
        .header
        .as_ref()
        .and_then(|header| header.get("map_name"))
        .cloned()
        .unwrap_or_default()
}

fn players(table: &ticks::Ticks<'_>, roster: &ticks::Roster) -> Vec<PlayerInfo> {
    let names = table.names(roster);
    let teams = table.final_teams(roster);

    roster
        .steam_ids()
        .map(|(steam_id, slot)| PlayerInfo {
            slot,
            steam_id,
            name: names.get(&slot).cloned().unwrap_or_default(),
            team: teams.get(&slot).copied().unwrap_or(Team::T),
        })
        .collect()
}
