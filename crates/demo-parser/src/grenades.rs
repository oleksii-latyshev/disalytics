use crate::columns::{Columns, float_at, id_at, text_at};
use crate::error::ParseError;
use crate::fields::{float, integer, steam_id, text};
use crate::passes::Passes;
use crate::schema::{DEFAULT_SAMPLE_HZ, Grenade, GrenadeTrajectory, GrenadeType, Tick, WorldPoint};
use crate::ticks::frame_of;
use crate::upstream::prop;
use parser::parse_demo::DemoOutput;
use std::collections::{BTreeMap, BTreeSet};

/// Entity indices are recycled within a match, so a gap this long in a projectile's samples means a
/// different projectile rather than a dropped tick. Upstream samples every tick a projectile lives.
const REUSE_GAP_TICKS: Tick = 8;

/// How long after a projectile's last sample its detonation may still arrive. One second covers the
/// ordering slack between the entity leaving the world and the event that says why.
const DETONATION_SLACK_TICKS: Tick = 64;

/// A cloud is gone the tick after its projectile stops being sampled. Measured rather than assumed:
/// on the fixture demo every one of the 125 smokes that carries a `smokegrenade_expired` has it
/// exactly here, and the 11 that carry none were deleted by the round's own cleanup, which fires no
/// event at all (`docs/PARSER.md` §19).
const AREA_END_TICKS_AFTER_LAST_SAMPLE: Tick = 1;

struct Flight {
    thrower: u64,
    class: String,
    ticks: Vec<Tick>,
    xs: Vec<f32>,
    ys: Vec<f32>,
    zs: Vec<f32>,
}

impl Flight {
    fn first_tick(&self) -> Tick {
        self.ticks.first().copied().unwrap_or_default()
    }

    fn last_tick(&self) -> Tick {
        self.ticks.last().copied().unwrap_or_default()
    }

    /// Downsampled the same way [`crate::schema::TickTrack`] is: the first sample in each frame
    /// wins, so a trajectory and a player position taken from the same frame describe the same
    /// moment.
    fn trajectory(&self, tick_rate: u32) -> GrenadeTrajectory {
        let first_tick = self.first_tick();
        let mut trajectory = GrenadeTrajectory {
            sample_hz: DEFAULT_SAMPLE_HZ,
            first_tick,
            sample_count: 0,
            x: Vec::new(),
            y: Vec::new(),
            z: Vec::new(),
        };

        let mut previous_frame = None;
        for index in 0..self.ticks.len() {
            let frame = frame_of(self.ticks[index], tick_rate);
            if previous_frame == Some(frame) {
                continue;
            }
            previous_frame = Some(frame);
            trajectory.x.push(self.xs[index]);
            trajectory.y.push(self.ys[index]);
            trajectory.z.push(self.zs[index]);
        }

        trajectory.sample_count = trajectory.x.len();
        trajectory
    }
}

/// A grenade that landed: where and when it went off, and when it stopped mattering.
struct Ending {
    detonation_tick: Option<Tick>,
    detonation_position: Option<WorldPoint>,
    expiry_tick: Option<Tick>,
}

pub(crate) fn build(
    projectiles: &DemoOutput,
    passes: &Passes<'_>,
    tick_rate: u32,
) -> Result<Vec<Grenade>, ParseError> {
    let columns = Columns::of(projectiles);
    for name in [
        prop::TICK,
        prop::STEAM_ID,
        prop::GRENADE_ENTITY,
        prop::GRENADE_TYPE,
        prop::GRENADE_X,
        prop::GRENADE_Y,
        prop::GRENADE_Z,
    ] {
        columns.require(name)?;
    }

    let flights = flights(&columns);
    let fire_types = thrown_fire_types(passes);
    let mut spent: BTreeSet<(Tick, i32)> = BTreeSet::new();
    let mut spent_infernos: BTreeSet<Tick> = BTreeSet::new();

    let mut grenades: Vec<Grenade> = Vec::with_capacity(flights.len());
    for ((entity, _), flight) in &flights {
        let Some(thrower) = passes.roster.slot(flight.thrower) else {
            continue;
        };
        let Some(grenade_type) = grenade_type_of(&flight.class, flight, &fire_types) else {
            continue;
        };

        let ending = if matches!(grenade_type, GrenadeType::Molotov | GrenadeType::IncGrenade) {
            inferno_ending(passes, flight, &mut spent_infernos)
        } else {
            detonation_ending(passes, grenade_type, *entity, flight, &mut spent)
        };

        grenades.push(Grenade {
            thrower,
            grenade_type,
            throw_tick: flight.first_tick(),
            detonation_tick: ending.detonation_tick,
            detonation_position: ending.detonation_position,
            expiry_tick: ending.expiry_tick,
            trajectory: flight.trajectory(tick_rate),
        });
    }

    grenades.sort_by_key(|grenade| (grenade.throw_tick, grenade.thrower));
    Ok(grenades)
}

/// Keyed by entity index and by the tick the entity started being that projectile, because the
/// index alone is reused several times over a match.
fn flights(columns: &Columns<'_>) -> BTreeMap<(i32, Tick), Flight> {
    let ticks = columns.integers(prop::TICK);
    let steam_ids = columns.ids_64(prop::STEAM_ID);
    let entities = columns.integers(prop::GRENADE_ENTITY);
    let classes = columns.texts(prop::GRENADE_TYPE);
    let xs = columns.floats(prop::GRENADE_X);
    let ys = columns.floats(prop::GRENADE_Y);
    let zs = columns.floats(prop::GRENADE_Z);

    let mut flights: BTreeMap<(i32, Tick), Flight> = BTreeMap::new();
    let mut open: BTreeMap<i32, (Tick, Tick)> = BTreeMap::new();
    for row in 0..columns.row_count() {
        let (Some(tick), Some(entity)) = (ticks.at(row), entities.at(row)) else {
            continue;
        };
        let (Ok(tick), Ok(entity)) = (i32::try_from(tick), i32::try_from(entity)) else {
            continue;
        };
        let (Some(thrower), Some(class)) = (id_at(steam_ids, row), text_at(classes, row)) else {
            continue;
        };
        let (Some(x), Some(y), Some(z)) = (float_at(xs, row), float_at(ys, row), float_at(zs, row))
        else {
            continue;
        };

        let started = match open.get(&entity) {
            Some((started, previous)) if tick - *previous <= REUSE_GAP_TICKS => *started,
            _ => tick,
        };
        open.insert(entity, (started, tick));

        let flight = flights.entry((entity, started)).or_insert_with(|| Flight {
            thrower,
            class: class.to_owned(),
            ticks: Vec::new(),
            xs: Vec::new(),
            ys: Vec::new(),
            zs: Vec::new(),
        });
        flight.ticks.push(tick);
        flight.xs.push(x);
        flight.ys.push(y);
        flight.zs.push(z);
    }
    flights
}

/// `CMolotovProjectile` covers both the molotov and the incendiary — the projectile entity is the
/// same class for either. The weapon the thrower fired is what tells them apart.
fn thrown_fire_types(passes: &Passes<'_>) -> BTreeMap<u64, Vec<(Tick, GrenadeType)>> {
    let mut by_thrower: BTreeMap<u64, Vec<(Tick, GrenadeType)>> = BTreeMap::new();
    for event in &passes.events.game_events {
        if event.name != "weapon_fire" {
            continue;
        }
        let grenade_type = match text(event, "weapon") {
            Some("weapon_molotov") => GrenadeType::Molotov,
            Some("weapon_incgrenade") => GrenadeType::IncGrenade,
            _ => continue,
        };
        if let Some(thrower) = steam_id(event, "user_steamid") {
            by_thrower
                .entry(thrower)
                .or_default()
                .push((event.tick, grenade_type));
        }
    }
    for fires in by_thrower.values_mut() {
        fires.sort_unstable_by_key(|(tick, _)| *tick);
    }
    by_thrower
}

fn grenade_type_of(
    class: &str,
    flight: &Flight,
    fire_types: &BTreeMap<u64, Vec<(Tick, GrenadeType)>>,
) -> Option<GrenadeType> {
    match class {
        "CHEGrenadeProjectile" => Some(GrenadeType::HeGrenade),
        "CFlashbangProjectile" => Some(GrenadeType::Flashbang),
        "CSmokeGrenadeProjectile" => Some(GrenadeType::SmokeGrenade),
        "CDecoyProjectile" => Some(GrenadeType::Decoy),
        "CMolotovProjectile" => Some(
            fire_types
                .get(&flight.thrower)
                .and_then(|fires| {
                    fires
                        .iter()
                        .rfind(|(tick, _)| *tick <= flight.first_tick())
                        .map(|(_, grenade_type)| *grenade_type)
                })
                .unwrap_or(GrenadeType::Molotov),
        ),
        _ => None,
    }
}

fn detonation_ending(
    passes: &Passes<'_>,
    grenade_type: GrenadeType,
    entity: i32,
    flight: &Flight,
    spent: &mut BTreeSet<(Tick, i32)>,
) -> Ending {
    let detonation = detonation_event_name(grenade_type)
        .and_then(|name| matching_event(passes, name, entity, flight, spent));

    Ending {
        detonation_tick: detonation.map(|(tick, _)| tick),
        detonation_position: detonation.and_then(|(_, position)| position),
        expiry_tick: area_expiry(grenade_type, flight),
    }
}

/// When an area grenade's cloud is gone, taken from the projectile's own samples rather than from
/// the event that announces it.
///
/// The event is the less complete of the two sources, not the more authoritative one: a smoke still
/// up when the round is cleaned up is deleted without a `smokegrenade_expired`, and reading the
/// absence as "it never bloomed" left 8% of the fixture's smokes off the plate entirely. The
/// projectile stops being sampled at the same moment either way.
fn area_expiry(grenade_type: GrenadeType, flight: &Flight) -> Option<Tick> {
    match grenade_type {
        GrenadeType::SmokeGrenade | GrenadeType::Decoy => {
            Some(flight.last_tick() + AREA_END_TICKS_AFTER_LAST_SAMPLE)
        }
        _ => None,
    }
}

fn matching_event(
    passes: &Passes<'_>,
    name: &str,
    entity: i32,
    flight: &Flight,
    spent: &mut BTreeSet<(Tick, i32)>,
) -> Option<(Tick, Option<WorldPoint>)> {
    let found = passes
        .events
        .game_events
        .iter()
        .filter(|event| event.name == name)
        .filter(|event| integer(event, "entityid") == Some(i64::from(entity)))
        .filter(|event| {
            event.tick >= flight.first_tick()
                && event.tick <= flight.last_tick() + DETONATION_SLACK_TICKS
        })
        .find(|event| !spent.contains(&(event.tick, entity)))?;

    spent.insert((found.tick, entity));
    Some((found.tick, position_of(found)))
}

/// A molotov's flames are a different entity from the projectile that carried them, so the two are
/// joined by thrower and by time rather than by entity index.
fn inferno_ending(passes: &Passes<'_>, flight: &Flight, spent: &mut BTreeSet<Tick>) -> Ending {
    let Some(startburn) = passes
        .events
        .game_events
        .iter()
        .filter(|event| event.name == "inferno_startburn")
        .filter(|event| steam_id(event, "user_steamid") == Some(flight.thrower))
        .filter(|event| {
            event.tick >= flight.first_tick()
                && event.tick <= flight.last_tick() + DETONATION_SLACK_TICKS
        })
        .find(|event| !spent.contains(&event.tick))
    else {
        return Ending {
            detonation_tick: None,
            detonation_position: None,
            expiry_tick: None,
        };
    };
    spent.insert(startburn.tick);

    let inferno = integer(startburn, "entityid");
    let expiry = passes
        .events
        .game_events
        .iter()
        .filter(|event| event.name == "inferno_expire")
        .filter(|event| inferno.is_some() && integer(event, "entityid") == inferno)
        .map(|event| event.tick)
        .find(|tick| *tick >= startburn.tick);

    Ending {
        detonation_tick: Some(startburn.tick),
        detonation_position: position_of(startburn),
        expiry_tick: expiry,
    }
}

const fn detonation_event_name(grenade_type: GrenadeType) -> Option<&'static str> {
    match grenade_type {
        GrenadeType::HeGrenade => Some("hegrenade_detonate"),
        GrenadeType::Flashbang => Some("flashbang_detonate"),
        GrenadeType::SmokeGrenade => Some("smokegrenade_detonate"),
        // The decoy's *start*: `decoy_detonate` is the pop that ends it, one tick past the
        // projectile's last sample, so taking that as the beginning gives an area with no life.
        GrenadeType::Decoy => Some("decoy_started"),
        GrenadeType::Molotov | GrenadeType::IncGrenade => None,
    }
}

fn position_of(event: &parser::second_pass::game_events::GameEvent) -> Option<WorldPoint> {
    Some(WorldPoint {
        x: float(event, "x")?,
        y: float(event, "y")?,
        z: float(event, "z")?,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        AREA_END_TICKS_AFTER_LAST_SAMPLE, DETONATION_SLACK_TICKS, Flight, REUSE_GAP_TICKS,
        area_expiry, detonation_event_name,
    };
    use crate::schema::{DEFAULT_SAMPLE_HZ, GrenadeType};

    fn flight_over(ticks: &[i32]) -> Flight {
        Flight {
            thrower: 1,
            class: "CSmokeGrenadeProjectile".to_owned(),
            ticks: ticks.to_vec(),
            xs: ticks
                .iter()
                .map(|tick| u16::try_from(*tick).map(f32::from).unwrap_or_default())
                .collect(),
            ys: vec![0.0; ticks.len()],
            zs: vec![0.0; ticks.len()],
        }
    }

    #[test]
    fn a_trajectory_keeps_one_sample_per_frame() {
        let flight = flight_over(&[64, 65, 66, 67, 68, 69, 70, 71]);

        let trajectory = flight.trajectory(64);

        assert_eq!(trajectory.sample_count, 2);
        assert_eq!(trajectory.sample_hz, DEFAULT_SAMPLE_HZ);
        assert_eq!(trajectory.first_tick, 64);
        assert_eq!(trajectory.x, vec![64.0, 68.0]);
    }

    #[test]
    fn a_trajectory_keeps_its_buffers_the_same_length() {
        let trajectory = flight_over(&[100, 104, 108]).trajectory(64);

        assert_eq!(trajectory.x.len(), trajectory.sample_count);
        assert_eq!(trajectory.y.len(), trajectory.sample_count);
        assert_eq!(trajectory.z.len(), trajectory.sample_count);
    }

    #[test]
    fn an_empty_flight_produces_an_empty_trajectory_rather_than_a_panic() {
        let trajectory = flight_over(&[]).trajectory(64);

        assert_eq!(trajectory.sample_count, 0);
        assert_eq!(trajectory.first_tick, 0);
    }

    #[test]
    fn only_the_grenades_with_a_detonation_event_look_for_one() {
        assert_eq!(
            detonation_event_name(GrenadeType::HeGrenade),
            Some("hegrenade_detonate")
        );
        assert_eq!(detonation_event_name(GrenadeType::Molotov), None);
        assert_eq!(detonation_event_name(GrenadeType::IncGrenade), None);
    }

    #[test]
    fn the_reuse_gap_is_shorter_than_the_detonation_slack() {
        const { assert!(REUSE_GAP_TICKS < DETONATION_SLACK_TICKS) }
    }

    #[test]
    fn an_area_ends_the_tick_after_its_projectile_stops_being_sampled() {
        let flight = flight_over(&[64, 128, 1_500]);

        assert_eq!(
            area_expiry(GrenadeType::SmokeGrenade, &flight),
            Some(1_500 + AREA_END_TICKS_AFTER_LAST_SAMPLE)
        );
        assert_eq!(
            area_expiry(GrenadeType::Decoy, &flight),
            Some(1_500 + AREA_END_TICKS_AFTER_LAST_SAMPLE)
        );
    }

    #[test]
    fn an_area_ends_whether_or_not_an_event_says_so() {
        let cleaned_up_by_the_round = flight_over(&[64, 128]);

        assert!(area_expiry(GrenadeType::SmokeGrenade, &cleaned_up_by_the_round).is_some());
    }

    #[test]
    fn a_grenade_that_is_a_mark_rather_than_an_area_has_no_expiry() {
        let flight = flight_over(&[64, 128]);

        assert_eq!(area_expiry(GrenadeType::HeGrenade, &flight), None);
        assert_eq!(area_expiry(GrenadeType::Flashbang, &flight), None);
    }

    #[test]
    fn fire_takes_its_ending_from_the_inferno_rather_than_from_the_projectile() {
        let flight = flight_over(&[64, 128]);

        assert_eq!(area_expiry(GrenadeType::Molotov, &flight), None);
        assert_eq!(area_expiry(GrenadeType::IncGrenade, &flight), None);
    }

    #[test]
    fn a_decoy_begins_where_it_starts_and_not_where_it_pops() {
        assert_eq!(
            detonation_event_name(GrenadeType::Decoy),
            Some("decoy_started")
        );
    }
}
