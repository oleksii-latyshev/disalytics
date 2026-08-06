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

/// What a caller can learn while a parse is still running.
///
/// Upstream exposes no hook inside a pass, so a pass boundary is the finest granularity that is
/// honest — `AGENTS.md` §7.3 asks the worker for a percentage and this is what it is derived from.
/// The header is worth its own callback because it is complete two passes in, while the third is
/// still running.
pub trait ParseObserver {
    fn pass_completed(&mut self, _label: &'static str, _completed_passes: usize) {}
    fn header_ready(&mut self, _header: &MatchHeader) {}
}

impl ParseObserver for () {}

/// Parses a demo into the shape `packages/demo-core` describes.
///
/// # Errors
///
/// Returns the [`ParseError`] the file earned. A file that is not a demo, is truncated, or is a
/// Source 1 recording is an expected outcome here, not a programmer error.
pub fn parse(demo_bytes: &[u8]) -> Result<ParsedDemo, ParseError> {
    parse_observed(demo_bytes, &mut ())
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
    let mut recorder = PassRecorder {
        labels: Vec::with_capacity(PASS_COUNT),
    };
    let demo = parse_observed(demo_bytes, &mut recorder)?;

    Ok((demo, recorder.labels))
}

struct PassRecorder {
    labels: Vec<&'static str>,
}

impl ParseObserver for PassRecorder {
    fn pass_completed(&mut self, label: &'static str, _completed_passes: usize) {
        self.labels.push(label);
    }
}

/// [`parse`], reporting each pass and the header to `observer` as they land.
///
/// # Errors
///
/// The same errors as [`parse`].
pub fn parse_observed(
    demo_bytes: &[u8],
    observer: &mut dyn ParseObserver,
) -> Result<ParsedDemo, ParseError> {
    let events_output = upstream::events_pass(demo_bytes)?;
    observer.pass_completed(upstream::PASS_LABELS[0], 1);

    let ticks_output = upstream::ticks_pass(demo_bytes)?;
    observer.pass_completed(upstream::PASS_LABELS[1], 2);

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
    observer.header_ready(&header);

    let projectiles_output = upstream::projectiles_pass(demo_bytes)?;
    match_events.grenades = grenades::build(&projectiles_output, &passes, tick_rate)?;
    observer.pass_completed(upstream::PASS_LABELS[2], PASS_COUNT);

    Ok(ParsedDemo {
        header,
        track,
        events: match_events,
    })
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

#[cfg(test)]
mod tests {
    use super::{MatchHeader, ParseObserver, parse_observed};

    #[derive(Default)]
    struct Recording {
        passes: Vec<(&'static str, usize)>,
        headers: usize,
    }

    impl ParseObserver for Recording {
        fn pass_completed(&mut self, label: &'static str, completed_passes: usize) {
            self.passes.push((label, completed_passes));
        }

        fn header_ready(&mut self, _header: &MatchHeader) {
            self.headers += 1;
        }
    }

    #[test]
    fn a_file_that_never_parses_reports_no_progress() {
        let mut observer = Recording::default();

        assert!(parse_observed(&[0_u8; 64], &mut observer).is_err());
        assert!(observer.passes.is_empty());
        assert_eq!(observer.headers, 0);
    }
}
