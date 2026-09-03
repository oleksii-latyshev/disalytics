use crate::columns::{Columns, IntegerColumn, bool_at, float_at, id_at, list_at, text_at};
use crate::error::ParseError;
use crate::schema::{
    ANGLE_SCALE, DEFAULT_SAMPLE_HZ, FLAG_ALIVE, FLAG_DEFUSING, FLAG_DUCKING, FLAG_HELMET,
    FLAG_PLANTING, FLAG_SCOPED, FLAG_WALKING, PlayerSlot, Team, Tick, TickTrack, WEAPON_NONE,
};
use crate::upstream::{TICK_PROPS, prop};
use crate::weapons::{WeaponTable, grenades_of};
use parser::parse_demo::DemoOutput;
use std::collections::{BTreeMap, BTreeSet};

/// CS2 servers run at 64 tick with subtick inputs, and upstream's own game-time helper divides by
/// 64 unconditionally. Nothing in the demo reports the rate: the header has no field for it,
/// `m_fRoundStartTime` drifts against the tick counter, and `sv_tickrate` is not among the convars
/// a GOTV recording carries. Cross-checked on the Phase 0 fixture against the one round that ended
/// on the clock — 7,360 ticks over a 115-second round is 64.0.
pub(crate) const TICK_RATE: u32 = 64;

/// Engine team numbers. 0 is unassigned and 1 is the spectator slot; neither reaches a roster.
const TEAM_T: i64 = 2;
const TEAM_CT: i64 = 3;

/// Who occupies which column of [`TickTrack`]. Sorted by `SteamID` so the same demo always produces
/// the same assignment — the columnar buffers are meaningless without it, and the OPFS cache key
/// assumes it (hard rule 8).
pub(crate) struct Roster {
    slots: BTreeMap<u64, PlayerSlot>,
}

impl Roster {
    pub(crate) fn slot(&self, steam_id: u64) -> Option<PlayerSlot> {
        self.slots.get(&steam_id).copied()
    }

    pub(crate) fn len(&self) -> usize {
        self.slots.len()
    }

    pub(crate) fn steam_ids(&self) -> impl Iterator<Item = (u64, PlayerSlot)> + '_ {
        self.slots.iter().map(|(steam_id, slot)| (*steam_id, *slot))
    }
}

/// One player's state at one tick, read for the handful of ticks that discrete events land on
/// rather than for every frame.
#[derive(Debug, Clone, Copy, Default)]
pub(crate) struct Sample {
    pub(crate) team: Option<Team>,
    pub(crate) money: i32,
    pub(crate) equipment_value: i32,
    pub(crate) flash_duration: f32,
    /// A world value rather than this player's, carried here because upstream writes a `Rules` prop
    /// onto every player row and this scan is already reading that row.
    pub(crate) round_time_seconds: Option<u32>,
}

pub(crate) struct Ticks<'a> {
    columns: Columns<'a>,
    tick_column: IntegerColumn<'a>,
    steam_ids: &'a [Option<u64>],
}

impl<'a> Ticks<'a> {
    pub(crate) fn of(output: &'a DemoOutput) -> Result<Self, ParseError> {
        let columns = Columns::of(output);
        for name in &TICK_PROPS {
            columns.require(name)?;
        }
        for name in [prop::TICK, prop::STEAM_ID, prop::NAME] {
            columns.require(name)?;
        }

        let tick_column = columns.integers(prop::TICK);
        let steam_ids = columns.ids_64(prop::STEAM_ID);

        Ok(Self {
            columns,
            tick_column,
            steam_ids,
        })
    }

    fn row_count(&self) -> usize {
        self.columns.row_count()
    }

    fn tick_at(&self, row: usize) -> Option<Tick> {
        self.tick_column
            .at(row)
            .and_then(|tick| i32::try_from(tick).ok())
    }

    pub(crate) fn roster(&self) -> Roster {
        let distinct: BTreeSet<u64> = (0..self.row_count())
            .filter_map(|row| id_at(self.steam_ids, row))
            .filter(|steam_id| *steam_id != 0)
            .collect();

        let slots = distinct
            .into_iter()
            .enumerate()
            .map(|(index, steam_id)| {
                (
                    steam_id,
                    PlayerSlot::try_from(index).unwrap_or(PlayerSlot::MAX),
                )
            })
            .collect();

        Roster { slots }
    }

    /// The last name each player used, which is the one a viewer recognises. Read backwards and
    /// stopped as soon as every slot has one: forwards it would allocate a `String` per row, and
    /// there are nearly two million of them.
    pub(crate) fn names(&self, roster: &Roster) -> BTreeMap<PlayerSlot, String> {
        let names = self.columns.texts(prop::NAME);
        let mut latest = BTreeMap::new();
        for row in (0..self.row_count()).rev() {
            if latest.len() == roster.len() {
                break;
            }
            let (Some(steam_id), Some(name)) = (id_at(self.steam_ids, row), text_at(names, row))
            else {
                continue;
            };
            if let Some(slot) = roster.slot(steam_id) {
                latest.entry(slot).or_insert_with(|| name.to_owned());
            }
        }
        latest
    }

    /// The side each player finished on. Halves swap sides, so this is the final team and not the
    /// team they played any given round on.
    pub(crate) fn final_teams(&self, roster: &Roster) -> BTreeMap<PlayerSlot, Team> {
        let teams = self.columns.integers(prop::TEAM);
        let mut latest = BTreeMap::new();
        for row in (0..self.row_count()).rev() {
            if latest.len() == roster.len() {
                break;
            }
            let (Some(steam_id), Some(team)) = (id_at(self.steam_ids, row), teams.at(row)) else {
                continue;
            };
            let (Some(slot), Some(team)) = (roster.slot(steam_id), team_of(team)) else {
                continue;
            };
            latest.entry(slot).or_insert(team);
        }
        latest
    }

    /// Reads the wanted ticks in one scan of the table. Discrete events land on a few hundred
    /// ticks, so scanning once for all of them beats scanning once per event.
    pub(crate) fn samples(
        &self,
        wanted: &BTreeSet<Tick>,
        roster: &Roster,
    ) -> BTreeMap<(Tick, PlayerSlot), Sample> {
        let teams = self.columns.integers(prop::TEAM);
        let money = self.columns.integers(prop::MONEY);
        let equipment = self.columns.integers(prop::EQUIPMENT_VALUE);
        let flash = self.columns.floats(prop::FLASH_DURATION);
        let round_time = self.columns.integers(prop::ROUND_TIME);

        let mut samples = BTreeMap::new();
        for row in 0..self.row_count() {
            let (Some(tick), Some(steam_id)) = (self.tick_at(row), id_at(self.steam_ids, row))
            else {
                continue;
            };
            if !wanted.contains(&tick) {
                continue;
            }
            let Some(slot) = roster.slot(steam_id) else {
                continue;
            };
            samples.insert(
                (tick, slot),
                Sample {
                    team: teams.at(row).and_then(team_of),
                    money: narrow(money.at(row)),
                    equipment_value: narrow(equipment.at(row)),
                    flash_duration: float_at(flash, row).unwrap_or_default(),
                    round_time_seconds: round_time.at(row).and_then(|value| u32::try_from(value).ok()),
                },
            );
        }
        samples
    }

    /// The weapons this match carried, indexed as [`TickTrack::weapon`] indexes them.
    ///
    /// Its own scan of the table: an index is only meaningful once every name is in, so the table
    /// has to be sealed before the writing pass can look anything up.
    fn weapon_table(&self) -> WeaponTable {
        let active = self.columns.texts(prop::ACTIVE_WEAPON);
        let mut table = WeaponTable::default();
        for row in 0..self.row_count() {
            if let Some(name) = text_at(active, row) {
                table.record(name);
            }
        }
        table.seal();
        table
    }

    /// Writes the columnar buffers, and the weapon table their `weapon` column indexes into. The
    /// first row that lands in a frame wins, so frame `f` holds the state at tick
    /// `f * tick_rate / sample_hz` rather than at whatever the last tick of the bucket happened to
    /// be.
    pub(crate) fn track(
        &self,
        roster: &Roster,
        planting: &[Planting],
        tick_rate: u32,
    ) -> (TickTrack, Vec<String>) {
        let weapons = self.weapon_table();
        let slot_count = roster.len();
        let last_tick = (0..self.row_count())
            .filter_map(|row| self.tick_at(row))
            .max()
            .unwrap_or_default();
        let frame_count = frame_of(last_tick, tick_rate) + 1;
        let cells = frame_count.saturating_mul(slot_count);

        let mut track = TickTrack {
            tick_rate,
            sample_hz: DEFAULT_SAMPLE_HZ,
            frame_count,
            slot_count,
            pos_x: vec![0.0; cells],
            pos_y: vec![0.0; cells],
            pos_z: vec![0.0; cells],
            yaw: vec![0; cells],
            pitch: vec![0; cells],
            health: vec![0; cells],
            flags: vec![0; cells],
            speed: vec![0; cells],
            armour: vec![0; cells],
            weapon: vec![WEAPON_NONE; cells],
            grenades: vec![0; cells],
            money: vec![0; cells],
        };

        let xs = self.columns.floats(prop::X);
        let ys = self.columns.floats(prop::Y);
        let zs = self.columns.floats(prop::Z);
        let yaws = self.columns.floats(prop::YAW);
        let pitches = self.columns.floats(prop::PITCH);
        let speeds = self.columns.floats(prop::SPEED);
        let healths = self.columns.integers(prop::HEALTH);
        let armours = self.columns.integers(prop::ARMOUR);
        let monies = self.columns.integers(prop::MONEY);
        let active = self.columns.texts(prop::ACTIVE_WEAPON);
        let inventories = self.columns.integer_lists(prop::INVENTORY_IDS);
        let flag_columns = [
            (FLAG_ALIVE, self.columns.booleans(prop::IS_ALIVE)),
            (FLAG_DUCKING, self.columns.booleans(prop::IS_DUCKING)),
            (FLAG_SCOPED, self.columns.booleans(prop::IS_SCOPED)),
            (FLAG_DEFUSING, self.columns.booleans(prop::IS_DEFUSING)),
            (FLAG_WALKING, self.columns.booleans(prop::IS_WALKING)),
            (FLAG_HELMET, self.columns.booleans(prop::HAS_HELMET)),
        ];

        let mut written = vec![false; cells];
        for row in 0..self.row_count() {
            let (Some(tick), Some(steam_id)) = (self.tick_at(row), id_at(self.steam_ids, row))
            else {
                continue;
            };
            let Some(slot) = roster.slot(steam_id) else {
                continue;
            };
            let Some(cell) = cell_of(frame_of(tick, tick_rate), slot, slot_count, frame_count)
            else {
                continue;
            };
            if written[cell] {
                continue;
            }
            written[cell] = true;

            track.pos_x[cell] = float_at(xs, row).unwrap_or_default();
            track.pos_y[cell] = float_at(ys, row).unwrap_or_default();
            track.pos_z[cell] = float_at(zs, row).unwrap_or_default();
            track.yaw[cell] = scaled_angle(float_at(yaws, row));
            track.pitch[cell] = scaled_angle(float_at(pitches, row));
            track.health[cell] = clamp_health(healths.at(row));
            track.speed[cell] = clamp_speed(float_at(speeds, row));
            track.armour[cell] = clamp_health(armours.at(row));
            track.money[cell] = clamp_money(monies.at(row));
            track.grenades[cell] = grenades_of(list_at(inventories, row));
            track.weapon[cell] =
                text_at(active, row).map_or(WEAPON_NONE, |name| weapons.index_of(name));
            track.flags[cell] = flag_columns
                .iter()
                .filter(|(_, column)| bool_at(column, row))
                .fold(0, |flags, (flag, _)| flags | flag);
        }

        // Planting has no per-player prop of its own — it is the window between a player starting a
        // plant and the bomb going down or the attempt ending.
        for window in planting {
            let first = frame_of(window.start_tick, tick_rate);
            let last = frame_of(window.end_tick, tick_rate);
            for frame in first..=last {
                if let Some(cell) = cell_of(frame, window.planter, slot_count, frame_count) {
                    track.flags[cell] |= FLAG_PLANTING;
                }
            }
        }

        (track, weapons.into_names())
    }
}

/// A player's uninterrupted attempt to plant, in ticks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Planting {
    pub(crate) planter: PlayerSlot,
    pub(crate) start_tick: Tick,
    pub(crate) end_tick: Tick,
}

pub(crate) const fn team_of(team_number: i64) -> Option<Team> {
    match team_number {
        TEAM_T => Some(Team::T),
        TEAM_CT => Some(Team::Ct),
        _ => None,
    }
}

pub(crate) fn frame_of(tick: Tick, tick_rate: u32) -> usize {
    if tick <= 0 || tick_rate == 0 {
        return 0;
    }
    let tick = u64::from(tick.unsigned_abs());
    let frame = tick * u64::from(DEFAULT_SAMPLE_HZ) / u64::from(tick_rate);
    usize::try_from(frame).unwrap_or(usize::MAX)
}

fn cell_of(frame: usize, slot: PlayerSlot, slot_count: usize, frame_count: usize) -> Option<usize> {
    if frame >= frame_count {
        return None;
    }
    let slot = usize::try_from(slot).ok()?;
    if slot >= slot_count {
        return None;
    }
    Some(frame * slot_count + slot)
}

fn scaled_angle(degrees: Option<f32>) -> i16 {
    let scaled = degrees.unwrap_or_default() * ANGLE_SCALE;
    if !scaled.is_finite() {
        return 0;
    }
    #[expect(
        clippy::cast_possible_truncation,
        reason = "clamped into i16 on the line above the cast"
    )]
    {
        scaled
            .clamp(f32::from(i16::MIN), f32::from(i16::MAX))
            .round() as i16
    }
}

fn clamp_health(health: Option<i64>) -> u8 {
    u8::try_from(health.unwrap_or_default().clamp(0, i64::from(u8::MAX))).unwrap_or(u8::MAX)
}

fn clamp_speed(speed: Option<f32>) -> u16 {
    let speed = speed.unwrap_or_default();
    if !speed.is_finite() {
        return 0;
    }
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "clamped into u16 on the line above the cast"
    )]
    {
        speed.clamp(0.0, f32::from(u16::MAX)).round() as u16
    }
}

/// The game caps a player at $16,000, so the buffer is `u16` and a value outside it is a demo
/// saying something impossible rather than a number worth carrying.
fn clamp_money(money: Option<i64>) -> u16 {
    u16::try_from(money.unwrap_or_default().clamp(0, i64::from(u16::MAX))).unwrap_or(u16::MAX)
}

fn narrow(value: Option<i64>) -> i32 {
    i32::try_from(value.unwrap_or_default()).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{TICK_RATE, clamp_health, clamp_speed, frame_of, scaled_angle, team_of};
    use crate::schema::{DEFAULT_SAMPLE_HZ, Team};

    #[test]
    fn a_frame_is_a_sample_index_and_not_a_tick() {
        assert_eq!(frame_of(0, 64), 0);
        assert_eq!(frame_of(3, 64), 0);
        assert_eq!(frame_of(4, 64), 1);
        assert_eq!(
            frame_of(64, 64),
            usize::try_from(DEFAULT_SAMPLE_HZ).unwrap()
        );
    }

    #[test]
    fn a_doubled_tick_rate_halves_the_frame_a_tick_lands_in() {
        assert_eq!(frame_of(128, 64), 32);
        assert_eq!(frame_of(128, 128), 16);
    }

    #[test]
    fn a_negative_or_rateless_tick_lands_in_the_first_frame() {
        assert_eq!(frame_of(-5, 64), 0);
        assert_eq!(frame_of(1000, 0), 0);
    }

    #[test]
    fn angles_are_stored_as_hundredths_of_a_degree() {
        assert_eq!(scaled_angle(Some(90.0)), 9_000);
        assert_eq!(scaled_angle(Some(-179.5)), -17_950);
        assert_eq!(scaled_angle(None), 0);
    }

    #[test]
    fn an_angle_outside_the_engine_range_saturates_rather_than_wrapping() {
        assert_eq!(scaled_angle(Some(1_000.0)), i16::MAX);
        assert_eq!(scaled_angle(Some(-1_000.0)), i16::MIN);
        assert_eq!(scaled_angle(Some(f32::NAN)), 0);
    }

    #[test]
    fn health_and_speed_saturate_into_their_buffers() {
        assert_eq!(clamp_health(Some(100)), 100);
        assert_eq!(clamp_health(Some(-1)), 0);
        assert_eq!(clamp_health(Some(9_000)), u8::MAX);
        assert_eq!(clamp_speed(Some(250.4)), 250);
        assert_eq!(clamp_speed(Some(-3.0)), 0);
        assert_eq!(clamp_speed(Some(100_000.0)), u16::MAX);
    }

    #[test]
    fn a_value_that_is_not_a_number_is_read_as_no_movement_rather_than_as_maximum_speed() {
        assert_eq!(clamp_speed(Some(f32::INFINITY)), 0);
        assert_eq!(clamp_speed(Some(f32::NAN)), 0);
    }

    #[test]
    fn only_the_two_playing_teams_have_a_side() {
        assert_eq!(team_of(2), Some(Team::T));
        assert_eq!(team_of(3), Some(Team::Ct));
        assert_eq!(team_of(1), None);
        assert_eq!(team_of(0), None);
    }

    #[test]
    fn the_tick_rate_is_the_rate_cs2_servers_run_at() {
        assert_eq!(TICK_RATE, 64);
    }
}
