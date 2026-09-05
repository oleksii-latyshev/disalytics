//! Drives the parser against a real demo.
//!
//! `AGENTS.md` §18 forbids committing a `.dem` and `docs/PARSER.md` §12 records why no small one
//! exists, so the demo is named by `DISALYTICS_FIXTURE_DEMO` and the test reports itself skipped
//! when that is unset. What *is* committed is the golden snapshot beside this file: a change to it
//! is a change to parsed output and gets read by a human, never accepted because a test asked.
//!
//! ```sh
//! DISALYTICS_FIXTURE_DEMO=/path/to/demo.dem cargo test -p demo-parser --test fixture
//! DISALYTICS_UPDATE_SNAPSHOT=1 DISALYTICS_FIXTURE_DEMO=... cargo test -p demo-parser --test fixture
//! ```

use demo_parser::{
    DefuseOutcome, Grenade, GrenadeType, Kill, MatchHeader, ParseObserver, ParsedDemo, Shot,
    TickTrack, WEAPON_NONE, parse_observed, parse_recording_passes,
};
use serde_json::{Value, json};
use std::path::PathBuf;
use std::time::Instant;

const FIXTURE_ENV: &str = "DISALYTICS_FIXTURE_DEMO";
const UPDATE_ENV: &str = "DISALYTICS_UPDATE_SNAPSHOT";
const SNAPSHOT: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/tests/snapshots/parsed-demo.json"
);

/// Enough of each list to read a diff by eye, with a checksum over all of it so a change in the
/// middle cannot hide behind the ends.
const SAMPLE_LENGTH: usize = 8;
const FRAME_STRIDE: usize = 6_000;

#[test]
fn a_real_demo_parses_deterministically_into_the_committed_snapshot() {
    let Some(path) = std::env::var_os(FIXTURE_ENV).map(PathBuf::from) else {
        eprintln!("skipped: set {FIXTURE_ENV} to a .dem to run this test");
        return;
    };

    let demo_bytes = std::fs::read(&path).expect("cannot read the fixture demo");
    eprintln!("fixture {} bytes: {}", demo_bytes.len(), path.display());

    let started = Instant::now();
    let (first, passes) = parse_recording_passes(&demo_bytes).expect("the fixture failed to parse");
    let elapsed = started.elapsed();
    eprintln!(
        "parsed in {:.2}s ({} bytes, three passes, native single-threaded)",
        elapsed.as_secs_f64(),
        demo_bytes.len()
    );

    assert_eq!(
        passes,
        vec!["events", "ticks", "projectiles"],
        "docs/PARSER.md §3 measured three passes as a floor upstream imposes"
    );

    assert_track_is_rectangular(&first.track);
    assert_weapon_column_indexes_the_table(&first);
    assert_shots_name_a_weapon_in_the_table(&first);
    assert_events_are_sorted_by_tick(&first);
    assert_every_area_that_detonates_can_be_drawn(&first);

    let mut observed = ObservedParse::default();
    let second = parse_observed(&demo_bytes, &mut observed).expect("the fixture failed to reparse");
    assert!(
        first == second,
        "the same bytes produced different output on a second parse (hard rule 8)"
    );

    assert_eq!(
        observed.reports,
        vec![
            "pass events 1/3".to_owned(),
            "pass ticks 2/3".to_owned(),
            format!("header {}", first.header.map),
            "pass projectiles 3/3".to_owned(),
        ],
        "the header has to reach a worker while the last pass is still running, or reporting it \
         separately buys nothing"
    );

    let snapshot = snapshot_of(&first, &passes);
    let rendered = format!("{}\n", serde_json::to_string_pretty(&snapshot).unwrap());

    if std::env::var_os(UPDATE_ENV).is_some() {
        std::fs::write(SNAPSHOT, &rendered).expect("cannot write the snapshot");
        eprintln!("wrote {SNAPSHOT} — read the diff before committing it");
        return;
    }

    let committed = std::fs::read_to_string(SNAPSHOT).expect("no committed snapshot to compare to");
    assert!(
        committed == rendered,
        "parsed output no longer matches the committed snapshot; \
         regenerate with {UPDATE_ENV}=1 and review the diff by hand"
    );
}

#[derive(Default)]
struct ObservedParse {
    reports: Vec<String>,
}

impl ParseObserver for ObservedParse {
    fn pass_completed(&mut self, label: &'static str, completed_passes: usize) {
        self.reports
            .push(format!("pass {label} {completed_passes}/3"));
    }

    fn header_ready(&mut self, header: &MatchHeader) {
        self.reports.push(format!("header {}", header.map));
    }
}

/// An area grenade is drawn between its detonation and its expiry, so one without an expiry is on
/// the plate for no time at all — a smoke the reader watches fly, land and never bloom.
///
/// This is the assertion the fixture was missing: 11 of the match's 136 smokes reached the schema
/// with `expiry_tick: None`, because a cloud the round's own cleanup deletes fires no
/// `smokegrenade_expired` and the absence was read as "it never bloomed" (`docs/PARSER.md` §19).
fn assert_every_area_that_detonates_can_be_drawn(demo: &ParsedDemo) {
    let unbounded = demo
        .events
        .grenades
        .iter()
        .filter(|grenade| is_area(grenade))
        .filter(|grenade| grenade.detonation_tick.is_some() && grenade.expiry_tick.is_none())
        .count();

    assert_eq!(
        unbounded, 0,
        "an area grenade that detonates and has no expiry draws nothing at all"
    );

    let backwards = demo
        .events
        .grenades
        .iter()
        .filter_map(|grenade| Some((grenade.detonation_tick?, grenade.expiry_tick?)))
        .filter(|(detonation, expiry)| expiry < detonation)
        .count();

    assert_eq!(backwards, 0, "an area cannot end before it begins");
}

const fn is_area(grenade: &Grenade) -> bool {
    matches!(
        grenade.grenade_type,
        GrenadeType::SmokeGrenade
            | GrenadeType::Molotov
            | GrenadeType::IncGrenade
            | GrenadeType::Decoy
    )
}

fn assert_track_is_rectangular(track: &TickTrack) {
    let cells = track.frame_count * track.slot_count;

    assert_eq!(track.pos_x.len(), cells);
    assert_eq!(track.pos_y.len(), cells);
    assert_eq!(track.pos_z.len(), cells);
    assert_eq!(track.yaw.len(), cells);
    assert_eq!(track.pitch.len(), cells);
    assert_eq!(track.health.len(), cells);
    assert_eq!(track.flags.len(), cells);
    assert_eq!(track.speed.len(), cells);
    assert_eq!(track.armour.len(), cells);
    assert_eq!(track.weapon.len(), cells);
    assert_eq!(track.grenades.len(), cells);
    assert_eq!(track.money.len(), cells);
    assert!(track.tick_rate > 0);
    assert!(track.sample_hz > 0);
}

/// The weapon column is a `u8` into a list built on another pass over the same table. Nothing in
/// the type system connects the two, so a match with real players is where the connection is
/// checked.
fn assert_weapon_column_indexes_the_table(demo: &ParsedDemo) {
    let table_length = u8::try_from(demo.header.weapons.len()).expect("table wider than its index");

    assert!(
        demo.track
            .weapon
            .iter()
            .all(|index| *index == WEAPON_NONE || *index < table_length),
        "a sample points past the end of the match's weapon table"
    );
    assert!(
        !demo.header.weapons.is_empty(),
        "a match in which nobody held a weapon is not a match"
    );
    assert!(
        demo.header.weapons.windows(2).all(|pair| pair[0] < pair[1]),
        "the weapon table is sorted and distinct, or hard rule 8 does not hold for it"
    );
    eprintln!("weapon table ({}): {:?}", table_length, demo.header.weapons);
}

/// A shot names its weapon by the same index the sample column uses, so the two are checked the
/// same way — and a match in which nobody fired is not a match.
fn assert_shots_name_a_weapon_in_the_table(demo: &ParsedDemo) {
    let table_length = u8::try_from(demo.header.weapons.len()).expect("table wider than its index");
    let unnamed = demo
        .events
        .shots
        .iter()
        .filter(|shot| shot.weapon == WEAPON_NONE)
        .count();

    assert!(!demo.events.shots.is_empty(), "nobody fired a shot");
    assert!(
        demo.events
            .shots
            .iter()
            .all(|shot| shot.weapon == WEAPON_NONE || shot.weapon < table_length),
        "a shot points past the end of the match's weapon table"
    );
    assert!(
        demo.events
            .shots
            .iter()
            .all(|shot| (shot.shooter as usize) < demo.track.slot_count),
        "a shot names a slot the track does not have"
    );
    let outside = demo
        .events
        .shots
        .iter()
        .filter(|shot| i32::from(shot.yaw).abs() > 180 * 100)
        .count();
    assert_eq!(
        outside, 0,
        "a shot's yaw left the -180..180 the ANGLE_SCALE encoding is sized for"
    );

    eprintln!(
        "shots: {} ({unnamed} naming no weapon in the table)",
        demo.events.shots.len()
    );
}

fn assert_events_are_sorted_by_tick(demo: &ParsedDemo) {
    let events = &demo.events;

    assert!(
        events
            .rounds
            .windows(2)
            .all(|pair| pair[0].start_tick <= pair[1].start_tick)
    );
    assert!(
        events
            .kills
            .windows(2)
            .all(|pair| pair[0].tick <= pair[1].tick)
    );
    assert!(
        events
            .damage
            .windows(2)
            .all(|pair| pair[0].tick <= pair[1].tick)
    );
    assert!(
        events
            .blinds
            .windows(2)
            .all(|pair| pair[0].tick <= pair[1].tick)
    );
    assert!(
        events
            .plants
            .windows(2)
            .all(|pair| pair[0].tick <= pair[1].tick)
    );
    assert!(
        events
            .defuses
            .windows(2)
            .all(|pair| pair[0].start_tick <= pair[1].start_tick)
    );
    assert!(
        events
            .grenades
            .windows(2)
            .all(|pair| pair[0].throw_tick <= pair[1].throw_tick)
    );
    assert!(
        events
            .shots
            .windows(2)
            .all(|pair| pair[0].tick <= pair[1].tick)
    );
}

fn snapshot_of(demo: &ParsedDemo, passes: &[&str]) -> Value {
    let events = &demo.events;

    json!({
        "passes": passes,
        "header": header_json(&demo.header),
        "track": track_json(&demo.track),
        "counts": {
            "rounds": events.rounds.len(),
            "kills": events.kills.len(),
            "damage": events.damage.len(),
            "shots": events.shots.len(),
            "grenades": events.grenades.len(),
            "blinds": events.blinds.len(),
            "plants": events.plants.len(),
            "defuses": events.defuses.len(),
        },
        "rounds": events.rounds.iter().map(round_json).collect::<Vec<_>>(),
        "plants": events.plants.iter().map(|plant| json!({
            "tick": plant.tick,
            "planter": plant.planter,
            "siteEntityId": plant.site_entity_id,
            "detonationTick": plant.detonation_tick,
        })).collect::<Vec<_>>(),
        "defuses": events.defuses.iter().map(|defuse| json!({
            "startTick": defuse.start_tick,
            "defuser": defuse.defuser,
            "hasKit": defuse.has_kit,
            "outcome": match defuse.outcome {
                DefuseOutcome::Completed(tick) => json!({ "status": "completed", "tick": tick }),
                DefuseOutcome::Aborted(tick) => json!({ "status": "aborted", "tick": tick }),
                DefuseOutcome::Interrupted => json!({ "status": "interrupted" }),
            },
        })).collect::<Vec<_>>(),
        "kills": sampled(&events.kills, kill_json),
        "damage": sampled(&events.damage, |entry| json!({
            "tick": entry.tick,
            "attacker": entry.attacker,
            "victim": entry.victim,
            "weapon": entry.weapon,
            "healthDamage": entry.health_damage,
            "armorDamage": entry.armor_damage,
            "hitGroup": entry.hit_group.as_str(),
        })),
        "blinds": sampled(&events.blinds, |blind| json!({
            "tick": blind.tick,
            "victim": blind.victim,
            "attacker": blind.attacker,
            "durationSeconds": blind.duration_seconds,
            "isTeammate": blind.is_teammate,
        })),
        "shotsByWeapon": shots_by_weapon(&events.shots, &demo.header.weapons),
        "shots": sampled(&events.shots, shot_json),
        "grenadesByType": grenades_by_type(&events.grenades),
        "grenades": sampled(&events.grenades, grenade_json),
    })
}

/// The per-weapon shot counts a reviewer compares against `weapon_fire` for the same match —
/// `docs/PARSER.md` §18 records that join, and it is the evidence that `fire_bullets` counts
/// trigger pulls rather than bullets in the air.
fn shots_by_weapon(shots: &[Shot], weapons: &[String]) -> Value {
    let mut counts: std::collections::BTreeMap<&str, usize> = std::collections::BTreeMap::new();
    for shot in shots {
        let name = weapons
            .get(usize::from(shot.weapon))
            .map_or("<none>", String::as_str);
        *counts.entry(name).or_insert(0) += 1;
    }
    json!(counts)
}

fn shot_json(shot: &Shot) -> Value {
    json!({
        "tick": shot.tick,
        "shooter": shot.shooter,
        "weapon": shot.weapon,
        "yaw": shot.yaw,
    })
}

/// Every thrown grenade should produce exactly one flight, so these counts are what a reviewer
/// compares against the `weapon_fire` events for the same match.
fn grenades_by_type(grenades: &[Grenade]) -> Value {
    let mut counts: std::collections::BTreeMap<&str, usize> = std::collections::BTreeMap::new();
    for grenade in grenades {
        *counts.entry(grenade.grenade_type.as_str()).or_insert(0) += 1;
    }
    json!(counts)
}

fn header_json(header: &MatchHeader) -> Value {
    json!({
        "map": header.map,
        "tickRate": header.tick_rate,
        "players": header.players.iter().map(|player| json!({
            "slot": player.slot,
            "steamId": player.steam_id.to_string(),
            "name": player.name,
            "team": player.team.as_str(),
        })).collect::<Vec<_>>(),
        "weapons": header.weapons,
    })
}

fn track_json(track: &TickTrack) -> Value {
    let frames: Vec<Value> = (0..track.frame_count)
        .step_by(FRAME_STRIDE)
        .map(|frame| {
            let cells: Vec<Value> = (0..track.slot_count)
                .map(|slot| {
                    let cell = frame * track.slot_count + slot;
                    json!([
                        track.pos_x[cell],
                        track.pos_y[cell],
                        track.pos_z[cell],
                        track.yaw[cell],
                        track.pitch[cell],
                        track.health[cell],
                        track.flags[cell],
                        track.speed[cell],
                        track.armour[cell],
                        track.weapon[cell],
                        track.grenades[cell],
                        track.money[cell],
                    ])
                })
                .collect();
            json!({ "frame": frame, "slots": cells })
        })
        .collect();

    json!({
        "tickRate": track.tick_rate,
        "sampleHz": track.sample_hz,
        "frameCount": track.frame_count,
        "slotCount": track.slot_count,
        "checksums": {
            "posX": checksum(&track.pos_x),
            "posY": checksum(&track.pos_y),
            "posZ": checksum(&track.pos_z),
            "yaw": checksum(&track.yaw),
            "pitch": checksum(&track.pitch),
            "health": checksum(&track.health),
            "flags": checksum(&track.flags),
            "speed": checksum(&track.speed),
            "armour": checksum(&track.armour),
            "weapon": checksum(&track.weapon),
            "grenades": checksum(&track.grenades),
            "money": checksum(&track.money),
        },
        "sampledFrames": frames,
    })
}

fn round_json(round: &demo_parser::Round) -> Value {
    json!({
        "number": round.number,
        "startTick": round.start_tick,
        "freezeTimeEndTick": round.freeze_time_end_tick,
        "endTick": round.end_tick,
        "winner": round.winner.as_str(),
        "reason": round.reason.as_str(),
        "roundTimeSeconds": round.round_time_seconds,
        "economy": round.economy.iter().map(|entry| json!({
            "slot": entry.slot,
            "money": entry.money,
            "equipmentValue": entry.equipment_value,
            "buyType": entry.buy_type.as_str(),
            "team": entry.team.map(demo_parser::Team::as_str),
        })).collect::<Vec<_>>(),
    })
}

fn kill_json(kill: &Kill) -> Value {
    json!({
        "tick": kill.tick,
        "attacker": kill.attacker,
        "victim": kill.victim,
        "assister": kill.assister,
        "weapon": kill.weapon,
        "isHeadshot": kill.is_headshot,
        "isWallbang": kill.is_wallbang,
        "isThroughSmoke": kill.is_through_smoke,
        "isNoScope": kill.is_no_scope,
        "isAttackerBlind": kill.is_attacker_blind,
        "isVictimBlind": kill.is_victim_blind,
        "distanceUnits": kill.distance_units,
    })
}

fn grenade_json(grenade: &Grenade) -> Value {
    json!({
        "thrower": grenade.thrower,
        "type": grenade.grenade_type.as_str(),
        "throwTick": grenade.throw_tick,
        "detonationTick": grenade.detonation_tick,
        "detonationPosition": grenade.detonation_position.map(|point| json!([point.x, point.y, point.z])),
        "expiryTick": grenade.expiry_tick,
        "trajectory": {
            "sampleHz": grenade.trajectory.sample_hz,
            "firstTick": grenade.trajectory.first_tick,
            "sampleCount": grenade.trajectory.sample_count,
            "x": checksum(&grenade.trajectory.x),
            "y": checksum(&grenade.trajectory.y),
            "z": checksum(&grenade.trajectory.z),
        },
    })
}

/// The whole list is checksummed; only its ends are written out. A middle entry that changes moves
/// the checksum, which is what sends a reviewer to the regenerated file.
fn sampled<T>(entries: &[T], render: impl Fn(&T) -> Value) -> Value {
    let rendered: Vec<Value> = entries.iter().map(&render).collect();
    let all = serde_json::to_string(&rendered).unwrap_or_default();

    json!({
        "count": entries.len(),
        "checksum": fnv1a(all.as_bytes()),
        "first": rendered.iter().take(SAMPLE_LENGTH).collect::<Vec<_>>(),
        "last": rendered.iter().rev().take(SAMPLE_LENGTH).rev().collect::<Vec<_>>(),
    })
}

fn checksum<T: std::fmt::Debug>(values: &[T]) -> String {
    fnv1a(format!("{values:?}").as_bytes())
}

fn fnv1a(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x1000_0000_01b3);
    }
    format!("{hash:016x}")
}
