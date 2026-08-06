use crate::fields::steam_id;
use crate::schema::{PlayerSlot, Tick};
use crate::ticks::Roster;
use parser::parse_demo::DemoOutput;
use parser::second_pass::game_events::GameEvent;

/// The event pass, plus the slot assignment the tick pass produced. Every mapping from an event to
/// the schema needs both: the event names the player by `SteamID`, the schema by column.
pub(crate) struct Passes<'a> {
    pub(crate) events: &'a DemoOutput,
    pub(crate) roster: &'a Roster,
}

impl Passes<'_> {
    pub(crate) fn named<'b>(&'b self, name: &'b str) -> impl Iterator<Item = &'b GameEvent> + 'b {
        self.events
            .game_events
            .iter()
            .filter(move |event| event.name == name)
    }

    pub(crate) fn ticks_of(&self, name: &str) -> Vec<Tick> {
        self.named(name).map(|event| event.tick).collect()
    }

    pub(crate) fn match_start_tick(&self) -> Tick {
        self.named("begin_new_match")
            .map(|event| event.tick)
            .max()
            .unwrap_or_default()
    }

    pub(crate) fn slot(&self, event: &GameEvent, field_name: &str) -> Option<PlayerSlot> {
        self.roster.slot(steam_id(event, field_name)?)
    }
}
