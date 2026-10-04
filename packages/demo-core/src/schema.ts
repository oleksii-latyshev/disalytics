/**
 * Bumped on any change to what a parse produces — the shape below, and equally the values in it.
 * The OPFS cache is keyed on `${fileHash}:${SCHEMA_VERSION}`, so an entry written by an older
 * parser is a miss rather than something to migrate, and a demo already on the device is corrected
 * rather than left holding what it was stored with.
 */
export const SCHEMA_VERSION = 10;

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

/** The two bombsites, canonical game vocabulary that is never translated. */
export const BOMB_SITES = ['A', 'B'] as const;
export type BombSite = (typeof BOMB_SITES)[number];

export const BUY_TYPES = ['pistol', 'eco', 'semi-buy', 'force-buy', 'full-buy'] as const;
export type BuyType = (typeof BUY_TYPES)[number];

/**
 * What a kill or a damage event can be dealt with, in the game's internal vocabulary and normalised
 * by the parser: every knife skin and `bayonet` is `knife`, a `*_off` variant is its base id. The
 * closed list is `ENTRY_BY_INTERNAL_NAME`'s keys plus `knife`, read off 7 FACEIT demos and the
 * Phase 0 fixture (#53); all but the six below appeared in a recording.
 *
 * Never observed in any recording, kept because the game has them: `bizon`, `mp5sd`, `p90`,
 * `g3sg1`, `sawedoff`, `m249`.
 *
 * Mirrors `WEAPON_IDS` in `crates/demo-parser/src/vocabulary.rs`; `weapons:check` holds the two
 * together. This is **not** `MatchHeader.weapons`, which carries display names (`WeaponName`).
 */
export const WEAPON_IDS = [
  'cz75a',
  'deagle',
  'elite',
  'fiveseven',
  'glock',
  'hkp2000',
  'p250',
  'revolver',
  'tec9',
  'usp_silencer',
  'bizon',
  'mac10',
  'mp5sd',
  'mp7',
  'mp9',
  'p90',
  'ump45',
  'ak47',
  'aug',
  'famas',
  'galilar',
  'm4a1',
  'm4a1_silencer',
  'sg556',
  'awp',
  'g3sg1',
  'scar20',
  'ssg08',
  'mag7',
  'nova',
  'sawedoff',
  'xm1014',
  'm249',
  'negev',
  'knife',
  'taser',
  'c4',
  'decoy',
  'flashbang',
  'hegrenade',
  'incgrenade',
  'molotov',
  'smokegrenade',
] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

/**
 * What dealt damage without being a weapon anyone holds. `inferno` is the burning area a molotov or
 * incendiary leaves, which is how that utility kills, so it is a source rather than a throwable;
 * `world` is fall damage, the `kill` command and the empty string; `unknown` is whatever a future
 * demo says that this list has never heard of, which degrades rather than failing the parse.
 *
 * Mirrors `DAMAGE_SOURCES` in `crates/demo-parser/src/vocabulary.rs`.
 */
export const DAMAGE_SOURCES = ['inferno', 'planted_c4', 'world', 'unknown'] as const;
export type DamageSource = (typeof DAMAGE_SOURCES)[number];

/** The closed vocabulary of `Kill.weapon` and `Damage.weapon`. */
export type DamageWeapon = WeaponId | DamageSource;

/**
 * An entry of `MatchHeader.weapons`: upstream's display name (`AK-47`), a different vocabulary from
 * `WeaponId` and deliberately not closed, because the table is built per match from what the demo
 * said (`docs/PARSER.md` §17).
 */
export type WeaponName = string;

// flags bitfield — must stay in sync with the writer in crates/demo-parser.
export const FLAG_ALIVE = 1 << 0;
export const FLAG_DUCKING = 1 << 1;
export const FLAG_SCOPED = 1 << 2;
export const FLAG_DEFUSING = 1 << 3;
export const FLAG_PLANTING = 1 << 4;
export const FLAG_WALKING = 1 << 5;
export const FLAG_HELMET = 1 << 6;

// grenades bitfield — must stay in sync with the writer in crates/demo-parser. Molotov and
// incendiary share one bit: they are the same thing to a reader deciding whether a corner is
// deniable, and `docs/DESIGN.md` §5.3 asks for one fire glyph.
export const GRENADE_HE = 1 << 0;
export const GRENADE_FLASH = 1 << 1;
/** The game allows two flashbangs and only two, so the second one gets a bit rather than a count. */
export const GRENADE_FLASH_SECOND = 1 << 2;
export const GRENADE_SMOKE = 1 << 3;
export const GRENADE_FIRE = 1 << 4;
export const GRENADE_DECOY = 1 << 5;
export const GRENADE_DEFUSE_KIT = 1 << 6;

/**
 * The `TickTrack.weapon` value for a slot holding nothing — a dead player, or a frame before the
 * player has spawned. `255` rather than `0` because `0` is a legitimate index into the table.
 */
export const WEAPON_NONE = 255;

/** Positional sampling rate. Raising it multiplies every buffer in `TickTrack`. */
export const DEFAULT_SAMPLE_HZ = 16;

// Yaw and pitch are stored as degrees x 100. The engine's signed ranges — yaw -180..180, pitch
// -90..90 — are what keep the scaled value inside Int16.
export const ANGLE_SCALE = 100;

/**
 * Per-tick player state, columnar. Every buffer is indexed `frame * slotCount + slot`, and nothing
 * here is ever read through a per-frame object.
 *
 * The buffers are `ArrayBuffer`-backed rather than `ArrayBufferLike`: they cross out of the parse
 * worker on a `postMessage` transfer list, and a `SharedArrayBuffer` cannot be transferred — nor
 * exist at all under the headers `AGENTS.md` §13 forbids.
 */
export interface TickTrack {
  tickRate: number;
  sampleHz: number;
  frameCount: number;
  slotCount: number;
  posX: Float32Array<ArrayBuffer>;
  posY: Float32Array<ArrayBuffer>;
  posZ: Float32Array<ArrayBuffer>;
  yaw: Int16Array<ArrayBuffer>;
  pitch: Int16Array<ArrayBuffer>;
  health: Uint8Array<ArrayBuffer>;
  /** Bitfield of the `FLAG_*` constants. */
  flags: Uint8Array<ArrayBuffer>;
  /** Units per second. Feeds the audibility model. */
  speed: Uint16Array<ArrayBuffer>;
  armour: Uint8Array<ArrayBuffer>;
  /** Index into `MatchHeader.weapons`, or `WEAPON_NONE`. */
  weapon: Uint8Array<ArrayBuffer>;
  /** Bitfield of the `GRENADE_*` constants. */
  grenades: Uint8Array<ArrayBuffer>;
  money: Uint16Array<ArrayBuffer>;
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
  weapon: DamageWeapon;
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
  weapon: DamageWeapon;
  healthDamage: number;
  armorDamage: number;
  hitGroup: HitGroup;
}

/**
 * One trigger pull with a gun. A grenade throw is a `Grenade` and a knife swing reaches the schema
 * as nothing at all: the demo counts what left a barrel separately from what a weapon did, and
 * `docs/PARSER.md` §18 carries the join between the two.
 */
export interface Shot {
  tick: Tick;
  shooter: PlayerSlot;
  /**
   * Index into `MatchHeader.weapons`, or `WEAPON_NONE` for a gun no sample ever saw held. The same
   * index and the same vocabulary as `TickTrack.weapon`, which is why a shot needs no `DamageWeapon`.
   */
  weapon: number;
  /**
   * Where the shooter was looking on the tick the trigger went, in `ANGLE_SCALE` — the same
   * encoding as `TickTrack.yaw`, so one rule reads both.
   *
   * A shot is an instant and the track is 16 Hz, so this is not the sample beside it: measured over
   * a whole match the sample misses this angle by a median 0.16° and by 15.68° on the worst shot.
   * `docs/PARSER.md` §22 has the table, and has why the muzzle and the pitch are not carried.
   */
  yaw: number;
}

/**
 * Where a projectile *was*, for as long as it existed — which is not the same as where it flew.
 * A smoke's cloud is the projectile entity, so its samples run to the cloud's own expiry, and an
 * HE's spent shell is kept for a further 5 s; a flash and a fire stop at the detonation. The schema
 * carries no index for the end of a flight, and `docs/PARSER.md` §20 has the per-type spread and
 * what to read instead.
 *
 * Per-tick data, so typed arrays rather than one object per sample; `sampleHz` records the rate the
 * samples survive at, which is below the rate they arrive at.
 */
export interface GrenadeTrajectory {
  sampleHz: number;
  firstTick: Tick;
  sampleCount: number;
  x: Float32Array<ArrayBuffer>;
  y: Float32Array<ArrayBuffer>;
  z: Float32Array<ArrayBuffer>;
}

export interface Grenade {
  thrower: PlayerSlot;
  type: GrenadeType;
  throwTick: Tick;
  /** `null` when the round ended before it went off. */
  detonationTick: Tick | null;
  detonationPosition: WorldPoint | null;
  /**
   * Areas only — smoke, fire and the decoy: when the cloud faded, the flames burned out, or the
   * decoy popped. A mark rather than an area has none.
   */
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
   * The bombsite, read from the planter's place name at the plant (`BombsiteA`, `BombsiteB`);
   * `null` for any other name or none. The trigger's entity index the demo also carries is
   * per-map and not stable across map revisions, so it is not kept.
   */
  site: BombSite | null;
  /**
   * When this bomb went off — `null` when it never did, whether it was defused or the round simply
   * ended first.
   *
   * `mp_c4timer` is not among the convars a recording carries, so the interval between a plant and
   * its own detonation is the only measurement of the bomb's timer the demo offers.
   */
  detonationTick: Tick | null;
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
  /**
   * The side the slot held for this round. `PlayerInfo.team` cannot answer it — that one is read at
   * the end of the match, and the halftime swap moves every player across. `null` for a slot with
   * no sample at freeze-time end.
   */
  team: Team | null;
}

export interface Round {
  number: number;
  startTick: Tick;
  freezeTimeEndTick: Tick;
  endTick: Tick;
  winner: Team;
  reason: RoundWinReason;
  /**
   * How long the round was given, read from the engine's own `m_iRoundTime` at freeze-time end.
   *
   * `null` where the demo does not carry that prop, which is a clock that cannot count down rather
   * than a parse failure. It is per round because a config change between halves or into overtime
   * moves it, and reading it once for the match would then be wrong for half of them.
   */
  roundTimeSeconds: number | null;
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
  shots: readonly Shot[];
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
  /**
   * The weapons this match used, in the order `TickTrack.weapon` indexes them. Built per match
   * rather than from a global enumeration, which is what keeps a weapon nobody has enumerated yet
   * from failing a parse.
   *
   * Canonical game vocabulary, never translated. A different vocabulary from `Kill.weapon`, which
   * is the closed `DamageWeapon`.
   */
  weapons: readonly WeaponName[];
}

export interface ParsedDemo {
  header: MatchHeader;
  track: TickTrack;
  events: MatchEvents;
}
