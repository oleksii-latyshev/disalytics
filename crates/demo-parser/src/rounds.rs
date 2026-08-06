use crate::fields::text;
use crate::passes::Passes;
use crate::schema::{PlayerEconomy, PlayerSlot, Round, RoundWinReason, Team, Tick};
use crate::ticks::Sample;
use crate::vocabulary::{buy_type_of, reason_of, team_of};
use std::collections::BTreeMap;

/// How much of a roster has to change sides before a round counts as the start of a half.
const HALF_SWAP_MAJORITY: usize = 8;

/// A round's shape, resolved before the economy that fills it is read.
#[derive(Debug, Clone, Copy)]
pub(crate) struct RoundFrame {
    pub(crate) number: u32,
    pub(crate) start_tick: Tick,
    pub(crate) freeze_time_end_tick: Tick,
    pub(crate) end_tick: Tick,
    winner: Team,
    reason: RoundWinReason,
}

/// Rounds are assembled from `round_end`, which is the only one of the four round events that says
/// who won. Warmup produces the same events, so anything before `begin_new_match` is dropped — on
/// the Phase 0 fixture that is two of the 32, leaving the 30 that were played.
pub(crate) fn frames(passes: &Passes<'_>) -> Vec<RoundFrame> {
    let match_start = passes.match_start_tick();
    let starts = passes.ticks_of("round_start");
    let freezes = passes.ticks_of("round_freeze_end");

    let mut frames = Vec::new();
    let mut previous_end = Tick::MIN;
    for event in passes.named("round_end") {
        let end_tick = event.tick;
        let ended = previous_end;
        previous_end = end_tick;

        if end_tick <= match_start {
            continue;
        }
        let (Some(winner), Some(reason)) = (
            text(event, "winner").and_then(team_of),
            text(event, "reason").map(reason_of),
        ) else {
            continue;
        };

        let start_tick = latest_within(&starts, ended, end_tick).unwrap_or(ended.max(match_start));
        let freeze_time_end_tick =
            latest_within(&freezes, start_tick, end_tick).unwrap_or(start_tick);

        frames.push(RoundFrame {
            number: u32::try_from(frames.len() + 1).unwrap_or_default(),
            start_tick,
            freeze_time_end_tick,
            end_tick,
            winner,
            reason,
        });
    }
    frames
}

pub(crate) fn build(
    passes: &Passes<'_>,
    frames: &[RoundFrame],
    samples: &BTreeMap<(Tick, PlayerSlot), Sample>,
) -> Vec<Round> {
    let slots: Vec<PlayerSlot> = passes.roster.steam_ids().map(|(_, slot)| slot).collect();

    let mut rounds = Vec::with_capacity(frames.len());
    let mut previous_teams: BTreeMap<PlayerSlot, Team> = BTreeMap::new();
    for frame in frames {
        let teams: BTreeMap<PlayerSlot, Team> = slots
            .iter()
            .filter_map(|slot| {
                let sample = samples.get(&(frame.freeze_time_end_tick, *slot))?;
                Some((*slot, sample.team?))
            })
            .collect();

        let swapped = teams
            .iter()
            .filter(|(slot, team)| previous_teams.get(slot).is_some_and(|was| was != *team))
            .count();
        let is_half_start = frame.number == 1 || swapped >= HALF_SWAP_MAJORITY;
        previous_teams = teams;

        let economy = slots
            .iter()
            .map(|slot| {
                let sample = samples
                    .get(&(frame.freeze_time_end_tick, *slot))
                    .copied()
                    .unwrap_or_default();
                PlayerEconomy {
                    slot: *slot,
                    money: sample.money,
                    equipment_value: sample.equipment_value,
                    buy_type: buy_type_of(sample.equipment_value, is_half_start),
                }
            })
            .collect();

        rounds.push(Round {
            number: frame.number,
            start_tick: frame.start_tick,
            freeze_time_end_tick: frame.freeze_time_end_tick,
            end_tick: frame.end_tick,
            winner: frame.winner,
            reason: frame.reason,
            economy,
        });
    }
    rounds
}

fn latest_within(ticks: &[Tick], after: Tick, until: Tick) -> Option<Tick> {
    ticks
        .iter()
        .copied()
        .filter(|tick| *tick > after && *tick <= until)
        .max()
}

#[cfg(test)]
mod tests {
    use super::latest_within;

    #[test]
    fn the_round_window_takes_the_last_start_before_the_end() {
        let starts = [4457, 4870, 4950, 9372];

        assert_eq!(latest_within(&starts, 4296, 8924), Some(4950));
        assert_eq!(latest_within(&starts, 8924, 12412), Some(9372));
        assert_eq!(latest_within(&starts, 12412, 12500), None);
    }

    #[test]
    fn a_warmup_restart_before_the_match_cannot_become_a_round_start() {
        let starts = [1, 4457, 4870];

        assert_eq!(latest_within(&starts, 4870, 8924), None);
    }
}
