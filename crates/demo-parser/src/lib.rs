#![forbid(unsafe_code)]

mod columns;
mod container;
mod error;
mod events;
mod fields;
mod grenades;
mod passes;
mod progress;
mod rounds;
mod schema;
mod ticks;
mod upstream;
mod vocabulary;
mod weapons;

pub use error::{ErrorCode, ParseError};
pub use progress::ParsePhase;
use progress::Progress;
pub use schema::{
    ANGLE_SCALE, Blind, BombDefuse, BombPlant, BuyType, DEFAULT_SAMPLE_HZ, Damage, DefuseOutcome,
    FLAG_ALIVE, FLAG_DEFUSING, FLAG_DUCKING, FLAG_HELMET, FLAG_PLANTING, FLAG_SCOPED, FLAG_WALKING,
    GRENADE_DECOY, GRENADE_DEFUSE_KIT, GRENADE_FIRE, GRENADE_FLASH, GRENADE_FLASH_SECOND,
    GRENADE_HE, GRENADE_SMOKE, Grenade, GrenadeTrajectory, GrenadeType, HitGroup, Kill,
    MatchEvents, MatchHeader, ParsedDemo, PlayerEconomy, PlayerInfo, PlayerSlot, Round,
    RoundWinReason, Shot, Team, Tick, TickTrack, WEAPON_NONE, WorldPoint,
};
pub use upstream::{PASS_COUNT, event_names};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// What a caller can learn while a parse is still running.
///
/// `progressed` hears each whole-number percentage once, with the phase it measures: the
/// container's compressed bytes while it expands, then upstream's position in the demo inside each
/// pass — `AGENTS.md` §7.3 asks the worker for exactly that. The header is worth its own callback
/// because it is complete two passes in, while the third is still running.
pub trait ParseObserver {
    fn progressed(&mut self, _phase: ParsePhase, _percent: u8) {}
    fn pass_completed(&mut self, _label: &'static str, _completed_passes: usize) {}
    fn header_ready(&mut self, _header: &MatchHeader) {}
}

impl ParseObserver for () {}

/// Parses a demo into the shape `packages/demo-core` describes.
///
/// `file_bytes` may be a raw `.dem` or a `.dem.zst` / `.dem.bz2` container, told apart by magic
/// bytes rather than by any name the file arrived under.
///
/// # Errors
///
/// Returns the [`ParseError`] the file earned. A file that is not a demo, is truncated, is a
/// Source 1 recording, or sits in a container that cannot be opened is an expected outcome here,
/// not a programmer error.
pub fn parse(file_bytes: &[u8]) -> Result<ParsedDemo, ParseError> {
    parse_observed(file_bytes, &mut ())
}

/// The demo's bytes, expanding the container if there is one and releasing the compressed file as
/// it returns.
///
/// A caller that owns the file — the WASM wrapper does — gets a lower peak this way than by
/// letting [`parse`] expand it, because the compressed copy is freed before the passes begin
/// rather than after them.
///
/// `observer` hears the expansion's progress, and nothing for a raw demo.
///
/// # Errors
///
/// Returns the [`ParseError`] the container earned.
pub fn decompressed(
    file_bytes: Vec<u8>,
    observer: &mut dyn ParseObserver,
) -> Result<Vec<u8>, ParseError> {
    let file_len = file_bytes.len();
    let progress = Progress::new(observer);

    container::decompressed_owned(file_bytes, &|consumed| {
        progress.decompressing(consumed, file_len);
    })
}

/// [`parse`], plus the passes it made over the demo. `docs/PARSER.md` §3 measured three as a floor
/// upstream imposes, and this is how that stays asserted rather than assumed.
///
/// # Errors
///
/// The same errors as [`parse`].
pub fn parse_recording_passes(
    file_bytes: &[u8],
) -> Result<(ParsedDemo, Vec<&'static str>), ParseError> {
    let mut recorder = PassRecorder {
        labels: Vec::with_capacity(PASS_COUNT),
    };
    let demo = parse_observed(file_bytes, &mut recorder)?;

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

/// [`parse`], reporting its progress, each pass and the header to `observer` as they land.
///
/// # Errors
///
/// The same errors as [`parse`].
pub fn parse_observed(
    file_bytes: &[u8],
    observer: &mut dyn ParseObserver,
) -> Result<ParsedDemo, ParseError> {
    let progress = Progress::new(observer);
    let demo_bytes = container::decompressed(file_bytes, &|consumed| {
        progress.decompressing(consumed, file_bytes.len());
    })?;

    parse_expanded(&demo_bytes, &progress)
}

fn parse_expanded(demo_bytes: &[u8], progress: &Progress<'_>) -> Result<ParsedDemo, ParseError> {
    let demo_len = demo_bytes.len();

    let events_output = upstream::events_pass(demo_bytes, &|position| {
        progress.reading(0, position, demo_len);
    })?;
    progress.pass_completed(0, demo_len);

    let ticks_output = upstream::ticks_pass(demo_bytes, &|position| {
        progress.reading(1, position, demo_len);
    })?;
    progress.pass_completed(1, demo_len);

    let table = ticks::Ticks::of(&ticks_output)?;
    let roster = table.roster();
    let passes = passes::Passes {
        events: &events_output,
        roster: &roster,
    };

    let tick_rate = ticks::TICK_RATE;
    let frames = rounds::frames(&passes);
    let samples = table.samples(&events::sampled_ticks(&passes, &frames), &roster);
    let (track, weapons) = table.track(&roster, &events::plant_windows(&passes), tick_rate);
    let header = MatchHeader {
        map: map_name(&events_output),
        tick_rate,
        players: players(&table, &roster),
        weapons,
    };
    let mut match_events = events::build(&passes, &frames, &samples, &header.weapons);

    drop(table);
    drop(ticks_output);
    progress.header_ready(&header);

    let projectiles_output = upstream::projectiles_pass(demo_bytes, &|position| {
        progress.reading(2, position, demo_len);
    })?;
    match_events.grenades = grenades::build(&projectiles_output, &passes, tick_rate)?;
    progress.pass_completed(2, demo_len);

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
    use super::{MatchHeader, ParseObserver, ParsePhase, parse_observed};

    #[derive(Default)]
    struct Recording {
        passes: Vec<(&'static str, usize)>,
        headers: usize,
        percents: usize,
    }

    impl ParseObserver for Recording {
        fn progressed(&mut self, _phase: ParsePhase, _percent: u8) {
            self.percents += 1;
        }

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
        assert_eq!(observer.percents, 0);
    }
}
