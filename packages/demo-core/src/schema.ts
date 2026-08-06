/**
 * Bumped on any change to the shape below. The OPFS cache is keyed on
 * `${fileHash}:${SCHEMA_VERSION}`, so an entry written by an older shape is a miss rather than
 * something to migrate.
 */
export const SCHEMA_VERSION = 2;

declare const unit: unique symbol;

/** A demo tick, counted at the demo's own tick rate. */
export type Tick = number & { readonly [unit]: 'Tick' };

/** A sample index into `TickTrack`, counted at its `sampleHz`. */
export type Frame = number & { readonly [unit]: 'Frame' };

/** A player's column in `TickTrack`, `0 <= slot < slotCount`. */
export type PlayerSlot = number & { readonly [unit]: 'PlayerSlot' };

// A brand exists only in the type system, so these three are the one place in the package where a
// cast carries meaning rather than silencing an error.
export const asTick = (value: number): Tick => value as Tick;
export const asFrame = (value: number): Frame => value as Frame;
export const asPlayerSlot = (value: number): PlayerSlot => value as PlayerSlot;

export const TEAMS = ['CT', 'T'] as const;
export type Team = (typeof TEAMS)[number];

export const GRENADE_TYPES = [
  'hegrenade',
  'flashbang',
  'smokegrenade',
  'molotov',
  'incgrenade',
  'decoy',
] as const;
export type GrenadeType = (typeof GRENADE_TYPES)[number];

export const HIT_GROUPS = [
  'generic',
  'head',
  'chest',
  'stomach',
  'left-arm',
  'right-arm',
  'left-leg',
  'right-leg',
  'neck',
  'gear',
] as const;
export type HitGroup = (typeof HIT_GROUPS)[number];

export const ROUND_WIN_REASONS = [
  'bomb-exploded',
  'bomb-defused',
  'all-ct-eliminated',
  'all-t-eliminated',
  'time-expired',
  'draw',
] as const;
export type RoundWinReason = (typeof ROUND_WIN_REASONS)[number];

export const BUY_TYPES = ['pistol', 'eco', 'semi-buy', 'force-buy', 'full-buy'] as const;
export type BuyType = (typeof BUY_TYPES)[number];

/**
 * The weapon identifier the parser emits, canonical game vocabulary that is never translated. It
 * stays a string because the vocabulary is upstream's to enumerate, not ours to recall.
 */
export type WeaponId = string;

// flags bitfield — must stay in sync with the writer in crates/demo-parser.
export const FLAG_ALIVE = 1 << 0;
export const FLAG_DUCKING = 1 << 1;
export const FLAG_SCOPED = 1 << 2;
export const FLAG_DEFUSING = 1 << 3;
export const FLAG_PLANTING = 1 << 4;
export const FLAG_WALKING = 1 << 5;

/** Positional sampling rate. Raising it multiplies every buffer in `TickTrack`. */
export const DEFAULT_SAMPLE_HZ = 16;

// Yaw and pitch are stored as degrees x 100. The engine's signed ranges — yaw -180..180, pitch
// -90..90 — are what keep the scaled value inside Int16.
export const ANGLE_SCALE = 100;

/**
 * Per-tick player state, columnar. Every buffer is indexed `frame * slotCount + slot`, and nothing
 * here is ever read through a per-frame object.
 */
export interface TickTrack {
  tickRate: number;
  sampleHz: number;
  frameCount: number;
  slotCount: number;
  posX: Float32Array;
  posY: Float32Array;
  posZ: Float32Array;
  yaw: Int16Array;
  pitch: Int16Array;
  health: Uint8Array;
  /** Bitfield of the `FLAG_*` constants. */
  flags: Uint8Array;
  /** Units per second. Feeds the audibility model. */
  speed: Uint16Array;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface Kill {
  tick: Tick;
  /** `null` when the world did the killing — fall damage, or the `kill` command. */
  attacker: PlayerSlot | null;
  victim: PlayerSlot;
  assister: PlayerSlot | null;
  weapon: WeaponId;
  isHeadshot: boolean;
  isWallbang: boolean;
  isThroughSmoke: boolean;
  isNoScope: boolean;
  isAttackerBlind: boolean;
  isVictimBlind: boolean;
  distanceUnits: number;
}

export interface Damage {
  tick: Tick;
  attacker: PlayerSlot | null;
  victim: PlayerSlot;
  weapon: WeaponId;
  healthDamage: number;
  armorDamage: number;
  hitGroup: HitGroup;
}

/**
 * A projectile's flight path. Per-tick data, so typed arrays rather than one object per sample;
 * `sampleHz` records the rate the samples survive at, which is below the rate they arrive at.
 */
export interface GrenadeTrajectory {
  sampleHz: number;
  firstTick: Tick;
  sampleCount: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
}

export interface Grenade {
  thrower: PlayerSlot;
  type: GrenadeType;
  throwTick: Tick;
  /** `null` when the round ended before it went off. */
  detonationTick: Tick | null;
  detonationPosition: WorldPoint | null;
  /** Smoke and fire only: when the cloud faded or the flames burned out. */
  expiryTick: Tick | null;
  trajectory: GrenadeTrajectory;
}

/** One affected player, not one flashbang — a single grenade produces several of these. */
export interface Blind {
  tick: Tick;
  victim: PlayerSlot;
  attacker: PlayerSlot | null;
  durationSeconds: number;
  isTeammate: boolean;
}

export interface BombPlant {
  tick: Tick;
  planter: PlayerSlot;
  /**
   * The bombsite trigger's entity index, as the demo reports it. Naming it A or B needs the site
   * polygons in `map-data` — the demo carries no name, and `m_iBombSite` reads 0 on every plant.
   */
  siteEntityId: number;
}

/** `interrupted` is a defuse that neither finished nor was let go of — the defuser died. */
export type DefuseOutcome =
  | { status: 'completed'; tick: Tick }
  | { status: 'aborted'; tick: Tick }
  | { status: 'interrupted' };

export interface BombDefuse {
  startTick: Tick;
  defuser: PlayerSlot;
  hasKit: boolean;
  outcome: DefuseOutcome;
}

export interface PlayerEconomy {
  slot: PlayerSlot;
  money: number;
  equipmentValue: number;
  buyType: BuyType;
}

export interface Round {
  number: number;
  startTick: Tick;
  freezeTimeEndTick: Tick;
  endTick: Tick;
  winner: Team;
  reason: RoundWinReason;
  /** Read at freeze-time end, one entry per slot. */
  economy: readonly PlayerEconomy[];
}

/**
 * Discrete events. Plain objects in arrays sorted ascending by the tick each one begins at, so a
 * lookup is a binary search — the columnar treatment belongs to `TickTrack` and to nothing here.
 */
export interface MatchEvents {
  rounds: readonly Round[];
  kills: readonly Kill[];
  damage: readonly Damage[];
  grenades: readonly Grenade[];
  blinds: readonly Blind[];
  plants: readonly BombPlant[];
  defuses: readonly BombDefuse[];
}

export interface PlayerInfo {
  slot: PlayerSlot;
  /** A 64-bit SteamID in decimal. It does not survive a `number`. */
  steamId: string;
  name: string;
  team: Team;
}

export interface MatchHeader {
  /** The demo's own map name, `de_mirage`. Game vocabulary: canonical, never translated. */
  map: string;
  tickRate: number;
  players: readonly PlayerInfo[];
}

export interface ParsedDemo {
  header: MatchHeader;
  track: TickTrack;
  events: MatchEvents;
}
