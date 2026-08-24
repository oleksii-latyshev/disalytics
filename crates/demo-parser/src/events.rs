use crate::fields::{boolean, float, integer, narrow, text};
use crate::passes::Passes;
use crate::rounds::RoundFrame;
use crate::schema::{
    Blind, BombDefuse, BombPlant, Damage, DefuseOutcome, Kill, MatchEvents, PlayerSlot, Shot, Tick,
    WEAPON_NONE,
};
use crate::ticks::{Planting, Sample};
use crate::vocabulary::hit_group_of;
use parser::second_pass::game_events::GameEvent;
use std::collections::{BTreeMap, BTreeSet};

/// A Source unit is one inch, and `player_death` reports its distance in metres. Measured against
/// positions from the tick pass over 219 kills on the Phase 0 fixture: median 39.366 against the
/// 39.3701 inches in a metre.
const UNITS_PER_METRE: f32 = 39.370_08;

/// The ticks discrete events land on, so the tick table is scanned once for all of them.
pub(crate) fn sampled_ticks(passes: &Passes<'_>, frames: &[RoundFrame]) -> BTreeSet<Tick> {
    let mut wanted: BTreeSet<Tick> = BTreeSet::new();
    for event in passes
        .named("player_death")
        .chain(passes.named("player_blind"))
    {
        wanted.insert(event.tick);
    }
    for frame in frames {
        wanted.insert(frame.freeze_time_end_tick);
    }
    wanted
}

pub(crate) fn build(
    passes: &Passes<'_>,
    frames: &[RoundFrame],
    samples: &BTreeMap<(Tick, PlayerSlot), Sample>,
    weapons: &[String],
) -> MatchEvents {
    MatchEvents {
        rounds: crate::rounds::build(passes, frames, samples),
        kills: kills(passes, samples),
        damage: damage(passes),
        shots: shots(passes, weapons),
        grenades: vec![],
        blinds: blinds(passes, samples),
        plants: plants(passes),
        defuses: defuses(passes),
    }
}

fn kills(passes: &Passes<'_>, samples: &BTreeMap<(Tick, PlayerSlot), Sample>) -> Vec<Kill> {
    let mut kills: Vec<Kill> = passes
        .named("player_death")
        .filter_map(|event| {
            let victim = passes.slot(event, "user_steamid")?;
            // `player_death` carries `attackerblind` but nothing for the victim, so the victim's
            // own flash timer at the death tick is what answers it — `docs/PARSER.md` §4.
            let is_victim_blind = samples
                .get(&(event.tick, victim))
                .is_some_and(|sample| sample.flash_duration > 0.0);

            Some(Kill {
                tick: event.tick,
                attacker: passes.slot(event, "attacker_steamid"),
                victim,
                assister: passes.slot(event, "assister_steamid"),
                weapon: text(event, "weapon").unwrap_or_default().to_owned(),
                is_headshot: boolean(event, "headshot"),
                is_wallbang: integer(event, "penetrated").unwrap_or_default() > 0,
                is_through_smoke: boolean(event, "thrusmoke"),
                is_no_scope: boolean(event, "noscope"),
                is_attacker_blind: boolean(event, "attackerblind"),
                is_victim_blind,
                distance_units: float(event, "distance").unwrap_or_default() * UNITS_PER_METRE,
            })
        })
        .collect();
    kills.sort_by_key(|kill| kill.tick);
    kills
}

fn damage(passes: &Passes<'_>) -> Vec<Damage> {
    let mut damage: Vec<Damage> = passes
        .named("player_hurt")
        .filter_map(|event| {
            Some(Damage {
                tick: event.tick,
                attacker: passes.slot(event, "attacker_steamid"),
                victim: passes.slot(event, "user_steamid")?,
                weapon: text(event, "weapon").unwrap_or_default().to_owned(),
                health_damage: narrow(integer(event, "dmg_health")),
                armor_damage: narrow(integer(event, "dmg_armor")),
                hit_group: hit_group_of(text(event, "hitgroup").unwrap_or_default()),
            })
        })
        .collect();
    damage.sort_by_key(|entry| entry.tick);
    damage
}

/// `fire_bullets` rather than `weapon_fire`: it is the event that carries the item definition
/// index, which is what lets a shot name its weapon in the sample column's own vocabulary instead
/// of in a fifth one. It also counts what left a barrel, so a thrown grenade and a knife swing are
/// not in it — `docs/PARSER.md` §18 has both counts and the join between them.
fn shots(passes: &Passes<'_>, weapons: &[String]) -> Vec<Shot> {
    let mut shots: Vec<Shot> = passes
        .named("fire_bullets")
        .filter_map(|event| {
            Some(Shot {
                tick: event.tick,
                shooter: passes.slot(event, "user_steamid")?,
                weapon: definition_index(event).map_or(WEAPON_NONE, |definition| {
                    crate::weapons::index_in(weapons, definition)
                }),
            })
        })
        .collect();
    shots.sort_by_key(|shot| shot.tick);
    shots
}

fn definition_index(event: &GameEvent) -> Option<u32> {
    u32::try_from(integer(event, "item_def_index")?).ok()
}

fn blinds(passes: &Passes<'_>, samples: &BTreeMap<(Tick, PlayerSlot), Sample>) -> Vec<Blind> {
    let mut blinds: Vec<Blind> = passes
        .named("player_blind")
        .filter_map(|event| {
            let victim = passes.slot(event, "user_steamid")?;
            let attacker = passes.slot(event, "attacker_steamid");
            let side_of = |slot: PlayerSlot| samples.get(&(event.tick, slot))?.team;
            let is_teammate = attacker
                .filter(|thrower| *thrower != victim)
                .and_then(|thrower| Some(side_of(thrower)? == side_of(victim)?))
                .unwrap_or(false);

            Some(Blind {
                tick: event.tick,
                victim,
                attacker,
                duration_seconds: float(event, "blind_duration").unwrap_or_default(),
                is_teammate,
            })
        })
        .collect();
    blinds.sort_by_key(|blind| blind.tick);
    blinds
}

fn plants(passes: &Passes<'_>) -> Vec<BombPlant> {
    let mut plants: Vec<BombPlant> = passes
        .named("bomb_planted")
        .filter_map(|event| {
            Some(BombPlant {
                tick: event.tick,
                planter: passes.slot(event, "user_steamid")?,
                site_entity_id: narrow(integer(event, "site")),
            })
        })
        .collect();
    plants.sort_by_key(|plant| plant.tick);
    plants
}

fn defuses(passes: &Passes<'_>) -> Vec<BombDefuse> {
    let completions = by_actor(passes, "bomb_defused");
    let aborts = by_actor(passes, "bomb_abortdefuse");
    let round_ends = passes.ticks_of("round_end");

    let mut defuses: Vec<BombDefuse> = passes
        .named("bomb_begindefuse")
        .filter_map(|event| {
            let defuser = passes.slot(event, "user_steamid")?;
            let deadline = first_at_or_after(&round_ends, event.tick).unwrap_or(Tick::MAX);
            let outcome_at = |ticks: Option<&Vec<Tick>>| {
                first_at_or_after(ticks?, event.tick).filter(|tick| *tick <= deadline)
            };

            let outcome = outcome_at(completions.get(&defuser)).map_or_else(
                || {
                    outcome_at(aborts.get(&defuser))
                        .map_or(DefuseOutcome::Interrupted, DefuseOutcome::Aborted)
                },
                DefuseOutcome::Completed,
            );

            Some(BombDefuse {
                start_tick: event.tick,
                defuser,
                has_kit: boolean(event, "haskit"),
                outcome,
            })
        })
        .collect();
    defuses.sort_by_key(|defuse| defuse.start_tick);
    defuses
}

/// The windows [`crate::ticks::Ticks::track`] turns into `FLAG_PLANTING`. There is no per-player
/// prop for planting: it is the span between a player starting a plant and the bomb going down, the
/// planter letting go, or the round ending — whichever comes first.
pub(crate) fn plant_windows(passes: &Passes<'_>) -> Vec<Planting> {
    let down_ticks = by_actor(passes, "bomb_planted");
    let give_up_ticks = by_actor(passes, "bomb_abortplant");
    let round_ends = passes.ticks_of("round_end");

    let mut windows: Vec<Planting> = passes
        .named("bomb_beginplant")
        .filter_map(|event| {
            let planter = passes.slot(event, "user_steamid")?;
            let end_tick = [
                down_ticks
                    .get(&planter)
                    .and_then(|ticks| first_at_or_after(ticks, event.tick)),
                give_up_ticks
                    .get(&planter)
                    .and_then(|ticks| first_at_or_after(ticks, event.tick)),
                first_at_or_after(&round_ends, event.tick),
            ]
            .into_iter()
            .flatten()
            .min()?;

            Some(Planting {
                planter,
                start_tick: event.tick,
                end_tick,
            })
        })
        .collect();
    windows.sort_by_key(|window| (window.start_tick, window.planter));
    windows
}

fn by_actor(passes: &Passes<'_>, name: &str) -> BTreeMap<PlayerSlot, Vec<Tick>> {
    let mut by_slot: BTreeMap<PlayerSlot, Vec<Tick>> = BTreeMap::new();
    for event in passes.named(name) {
        if let Some(slot) = passes.slot(event, "user_steamid") {
            by_slot.entry(slot).or_default().push(event.tick);
        }
    }
    for ticks in by_slot.values_mut() {
        ticks.sort_unstable();
    }
    by_slot
}

fn first_at_or_after(ticks: &[Tick], tick: Tick) -> Option<Tick> {
    ticks.iter().copied().find(|candidate| *candidate >= tick)
}

#[cfg(test)]
mod tests {
    use super::{UNITS_PER_METRE, first_at_or_after};

    #[test]
    fn a_metre_is_the_inches_a_source_unit_measures() {
        assert!((UNITS_PER_METRE - 39.370_08).abs() < 1e-4);
        assert!((45.0 - 1.143 * UNITS_PER_METRE).abs() < 0.1);
    }

    #[test]
    fn an_outcome_is_looked_for_at_or_after_the_tick_that_started_it() {
        let ticks = [39_399, 51_998, 106_421];

        assert_eq!(first_at_or_after(&ticks, 51_678), Some(51_998));
        assert_eq!(first_at_or_after(&ticks, 51_998), Some(51_998));
        assert_eq!(first_at_or_after(&ticks, 106_422), None);
    }
}
