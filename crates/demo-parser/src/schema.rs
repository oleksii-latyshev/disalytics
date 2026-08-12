//! The Rust half of the contract in `packages/demo-core/src/schema.ts`. Every name here has a
//! counterpart there, and a change to either is a `SCHEMA_VERSION` change.

/// Positional sampling rate. `TickTrack` is indexed in frames at this rate, never in ticks.
pub const DEFAULT_SAMPLE_HZ: u32 = 16;

/// View angles are stored as degrees x 100. Yaw -180..180 and pitch -90..90 are what keep the
/// scaled value inside `i16`.
pub const ANGLE_SCALE: f32 = 100.0;

// flags bitfield — must stay in sync with packages/demo-core/src/schema.ts
pub const FLAG_ALIVE: u8 = 1 << 0;
pub const FLAG_DUCKING: u8 = 1 << 1;
pub const FLAG_SCOPED: u8 = 1 << 2;
pub const FLAG_DEFUSING: u8 = 1 << 3;
pub const FLAG_PLANTING: u8 = 1 << 4;
pub const FLAG_WALKING: u8 = 1 << 5;
pub const FLAG_HELMET: u8 = 1 << 6;

// grenades bitfield — must stay in sync with packages/demo-core/src/schema.ts. Molotov and
// incendiary share one bit: they are the same thing to a reader deciding whether a corner is
// deniable, and `docs/DESIGN.md` §5.3 asks for one fire glyph.
pub const GRENADE_HE: u8 = 1 << 0;
pub const GRENADE_FLASH: u8 = 1 << 1;
/// The game allows two flashbangs and only two, so the second one gets a bit rather than a count.
pub const GRENADE_FLASH_SECOND: u8 = 1 << 2;
pub const GRENADE_SMOKE: u8 = 1 << 3;
pub const GRENADE_FIRE: u8 = 1 << 4;
pub const GRENADE_DECOY: u8 = 1 << 5;
pub const GRENADE_DEFUSE_KIT: u8 = 1 << 6;

/// The `TickTrack::weapon` value for a slot holding nothing — a dead player, or a frame before the
/// player has spawned. `255` rather than `0` because `0` is a legitimate index into the table.
pub const WEAPON_NONE: u8 = u8::MAX;

/// A demo tick, counted at the demo's own tick rate.
pub type Tick = i32;

/// A player's column in [`TickTrack`], `0 <= slot < slot_count`.
pub type PlayerSlot = u32;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Team {
    Ct,
    T,
}

impl Team {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Ct => "CT",
            Self::T => "T",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GrenadeType {
    HeGrenade,
    Flashbang,
    SmokeGrenade,
    Molotov,
    IncGrenade,
    Decoy,
}

impl GrenadeType {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::HeGrenade => "hegrenade",
            Self::Flashbang => "flashbang",
            Self::SmokeGrenade => "smokegrenade",
            Self::Molotov => "molotov",
            Self::IncGrenade => "incgrenade",
            Self::Decoy => "decoy",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitGroup {
    Generic,
    Head,
    Chest,
    Stomach,
    LeftArm,
    RightArm,
    LeftLeg,
    RightLeg,
    Neck,
    Gear,
}

impl HitGroup {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Generic => "generic",
            Self::Head => "head",
            Self::Chest => "chest",
            Self::Stomach => "stomach",
            Self::LeftArm => "left-arm",
            Self::RightArm => "right-arm",
            Self::LeftLeg => "left-leg",
            Self::RightLeg => "right-leg",
            Self::Neck => "neck",
            Self::Gear => "gear",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoundWinReason {
    BombExploded,
    BombDefused,
    AllCtEliminated,
    AllTEliminated,
    TimeExpired,
    Draw,
}

impl RoundWinReason {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::BombExploded => "bomb-exploded",
            Self::BombDefused => "bomb-defused",
            Self::AllCtEliminated => "all-ct-eliminated",
            Self::AllTEliminated => "all-t-eliminated",
            Self::TimeExpired => "time-expired",
            Self::Draw => "draw",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuyType {
    Pistol,
    Eco,
    SemiBuy,
    ForceBuy,
    FullBuy,
}

impl BuyType {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pistol => "pistol",
            Self::Eco => "eco",
            Self::SemiBuy => "semi-buy",
            Self::ForceBuy => "force-buy",
            Self::FullBuy => "full-buy",
        }
    }
}

/// Per-tick player state, columnar. Every buffer is indexed `frame * slot_count + slot`.
#[derive(Debug, Clone, PartialEq)]
pub struct TickTrack {
    pub tick_rate: u32,
    pub sample_hz: u32,
    pub frame_count: usize,
    pub slot_count: usize,
    pub pos_x: Vec<f32>,
    pub pos_y: Vec<f32>,
    pub pos_z: Vec<f32>,
    pub yaw: Vec<i16>,
    pub pitch: Vec<i16>,
    pub health: Vec<u8>,
    /// Bitfield of the `FLAG_*` constants.
    pub flags: Vec<u8>,
    /// Units per second. Feeds the audibility model.
    pub speed: Vec<u16>,
    pub armour: Vec<u8>,
    /// Index into [`MatchHeader::weapons`], or [`WEAPON_NONE`].
    pub weapon: Vec<u8>,
    /// Bitfield of the `GRENADE_*` constants.
    pub grenades: Vec<u8>,
    pub money: Vec<u16>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WorldPoint {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[expect(
    clippy::struct_excessive_bools,
    reason = "one field per flag the schema in packages/demo-core names; a bitfield here would not match it"
)]
#[derive(Debug, Clone, PartialEq)]
pub struct Kill {
    pub tick: Tick,
    /// `None` when the world did the killing — fall damage, or the `kill` command.
    pub attacker: Option<PlayerSlot>,
    pub victim: PlayerSlot,
    pub assister: Option<PlayerSlot>,
    pub weapon: String,
    pub is_headshot: bool,
    pub is_wallbang: bool,
    pub is_through_smoke: bool,
    pub is_no_scope: bool,
    pub is_attacker_blind: bool,
    pub is_victim_blind: bool,
    pub distance_units: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Damage {
    pub tick: Tick,
    pub attacker: Option<PlayerSlot>,
    pub victim: PlayerSlot,
    pub weapon: String,
    pub health_damage: i32,
    pub armor_damage: i32,
    pub hit_group: HitGroup,
}

/// A projectile's flight path, sampled at `sample_hz` rather than at the rate it arrives at.
#[derive(Debug, Clone, PartialEq)]
pub struct GrenadeTrajectory {
    pub sample_hz: u32,
    pub first_tick: Tick,
    pub sample_count: usize,
    pub x: Vec<f32>,
    pub y: Vec<f32>,
    pub z: Vec<f32>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Grenade {
    pub thrower: PlayerSlot,
    pub grenade_type: GrenadeType,
    pub throw_tick: Tick,
    /// `None` when the round ended before it went off.
    pub detonation_tick: Option<Tick>,
    pub detonation_position: Option<WorldPoint>,
    /// Smoke and fire only: when the cloud faded or the flames burned out.
    pub expiry_tick: Option<Tick>,
    pub trajectory: GrenadeTrajectory,
}

/// One affected player, not one flashbang — a single grenade produces several of these.
#[derive(Debug, Clone, PartialEq)]
pub struct Blind {
    pub tick: Tick,
    pub victim: PlayerSlot,
    pub attacker: Option<PlayerSlot>,
    pub duration_seconds: f32,
    pub is_teammate: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct BombPlant {
    pub tick: Tick,
    pub planter: PlayerSlot,
    /// The bombsite trigger's entity index. The demo carries no name for it.
    pub site_entity_id: i32,
}

/// `Interrupted` is a defuse that neither finished nor was let go of — the defuser died.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DefuseOutcome {
    Completed(Tick),
    Aborted(Tick),
    Interrupted,
}

#[derive(Debug, Clone, PartialEq)]
pub struct BombDefuse {
    pub start_tick: Tick,
    pub defuser: PlayerSlot,
    pub has_kit: bool,
    pub outcome: DefuseOutcome,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlayerEconomy {
    pub slot: PlayerSlot,
    pub money: i32,
    pub equipment_value: i32,
    pub buy_type: BuyType,
    /// The side the slot held for this round, which `PlayerInfo::team` cannot answer — that one
    /// reads the end of the match, and the halftime swap moves everyone. `None` for a slot with no
    /// sample at freeze-time end.
    pub team: Option<Team>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Round {
    pub number: u32,
    pub start_tick: Tick,
    pub freeze_time_end_tick: Tick,
    pub end_tick: Tick,
    pub winner: Team,
    pub reason: RoundWinReason,
    /// Read at freeze-time end, one entry per slot.
    pub economy: Vec<PlayerEconomy>,
}

/// Discrete events, each list sorted ascending by the tick it begins at.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct MatchEvents {
    pub rounds: Vec<Round>,
    pub kills: Vec<Kill>,
    pub damage: Vec<Damage>,
    pub grenades: Vec<Grenade>,
    pub blinds: Vec<Blind>,
    pub plants: Vec<BombPlant>,
    pub defuses: Vec<BombDefuse>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayerInfo {
    pub slot: PlayerSlot,
    /// A 64-bit `SteamID`. It reaches the client as decimal text, never as a `JavaScript` number.
    pub steam_id: u64,
    pub name: String,
    pub team: Team,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchHeader {
    /// The demo's own map name, `de_mirage`. Game vocabulary: canonical, never translated.
    pub map: String,
    pub tick_rate: u32,
    pub players: Vec<PlayerInfo>,
    /// The weapons this match used, in the order [`TickTrack::weapon`] indexes them. Built per
    /// match rather than from a global enumeration, which is what keeps a weapon nobody has
    /// enumerated yet from failing a parse — #53 has the measurements.
    ///
    /// Canonical game vocabulary, never translated. These are upstream's `WEAPINDICIES` values and
    /// so a different vocabulary from `Kill::weapon`, which carries what the game event said.
    pub weapons: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedDemo {
    pub header: MatchHeader,
    pub track: TickTrack,
    pub events: MatchEvents,
}
