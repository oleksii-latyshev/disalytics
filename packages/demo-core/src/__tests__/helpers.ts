import type {
  Blind,
  BombDefuse,
  Damage,
  Frame,
  Grenade,
  GrenadeTrajectory,
  Kill,
  MatchEvents,
  PlayerSlot,
  Shot,
  Tick,
  TickTrack,
} from '../schema';
import { ANGLE_SCALE, asPlayerSlot, asTick, DEFAULT_SAMPLE_HZ, WEAPON_NONE } from '../schema';

const DEFAULT_TICK_RATE = 64;
const DEFAULT_FRAME_COUNT = 8;
const DEFAULT_SLOT_COUNT = 10;

export interface NewTrackOptions {
  tickRate?: number;
  sampleHz?: number;
  frameCount?: number;
  slotCount?: number;
}

/**
 * A synthetic `TickTrack` measured in bytes rather than megabytes. Every buffer is zeroed, which
 * reads as ten dead players standing at the origin — set whatever the assertion depends on.
 */
export function newTrack(options: NewTrackOptions = {}): TickTrack {
  const tickRate = options.tickRate ?? DEFAULT_TICK_RATE;
  const sampleHz = options.sampleHz ?? DEFAULT_SAMPLE_HZ;
  const frameCount = options.frameCount ?? DEFAULT_FRAME_COUNT;
  const slotCount = options.slotCount ?? DEFAULT_SLOT_COUNT;
  const size = frameCount * slotCount;

  return {
    tickRate,
    sampleHz,
    frameCount,
    slotCount,
    posX: new Float32Array(size),
    posY: new Float32Array(size),
    posZ: new Float32Array(size),
    yaw: new Int16Array(size),
    pitch: new Int16Array(size),
    health: new Uint8Array(size),
    flags: new Uint8Array(size),
    speed: new Uint16Array(size),
    armour: new Uint8Array(size),
    weapon: new Uint8Array(size).fill(WEAPON_NONE),
    grenades: new Uint8Array(size),
    money: new Uint16Array(size),
  };
}

export interface PlayerSample {
  posX: number;
  posY: number;
  posZ: number;
  yawDegrees: number;
  pitchDegrees: number;
  health: number;
  flags: number;
  speed: number;
  armour: number;
  weapon: number;
  grenades: number;
  money: number;
}

type TrackBuffer =
  | Float32Array<ArrayBuffer>
  | Int16Array<ArrayBuffer>
  | Uint8Array<ArrayBuffer>
  | Uint16Array<ArrayBuffer>;

/**
 * Writes one player's sample into the track's buffers, taking angles in degrees so the test never
 * repeats the scaling. Fields left out keep whatever the buffer already held.
 */
export function atFrame(
  track: TickTrack,
  frame: Frame,
  slot: PlayerSlot,
  sample: Partial<PlayerSample>,
): void {
  if (frame < 0 || frame >= track.frameCount) {
    throw new RangeError(`frame ${frame} is outside a track of ${track.frameCount} frames`);
  }
  if (slot < 0 || slot >= track.slotCount) {
    throw new RangeError(`slot ${slot} is outside a track of ${track.slotCount} slots`);
  }

  const index = frame * track.slotCount + slot;
  const scaled = (degrees: number | undefined) =>
    degrees === undefined ? undefined : degrees * ANGLE_SCALE;

  const writes: readonly (readonly [number | undefined, TrackBuffer])[] = [
    [sample.posX, track.posX],
    [sample.posY, track.posY],
    [sample.posZ, track.posZ],
    [scaled(sample.yawDegrees), track.yaw],
    [scaled(sample.pitchDegrees), track.pitch],
    [sample.health, track.health],
    [sample.flags, track.flags],
    [sample.speed, track.speed],
    [sample.armour, track.armour],
    [sample.weapon, track.weapon],
    [sample.grenades, track.grenades],
    [sample.money, track.money],
  ];

  for (const [value, buffer] of writes) {
    if (value !== undefined) buffer[index] = value;
  }
}

export function newEvents(): MatchEvents {
  return {
    rounds: [],
    kills: [],
    damage: [],
    shots: [],
    grenades: [],
    blinds: [],
    plants: [],
    defuses: [],
  };
}

function sortedByTick<T>(items: readonly T[], added: T, tickOf: (item: T) => Tick): readonly T[] {
  return [...items, added].sort((left, right) => tickOf(left) - tickOf(right));
}

export function withKill(events: MatchEvents, overrides: Partial<Kill> = {}): MatchEvents {
  const kill: Kill = {
    tick: asTick(0),
    attacker: asPlayerSlot(0),
    victim: asPlayerSlot(1),
    assister: null,
    weapon: 'ak47',
    isHeadshot: false,
    isWallbang: false,
    isThroughSmoke: false,
    isNoScope: false,
    isAttackerBlind: false,
    isVictimBlind: false,
    distanceUnits: 0,
    ...overrides,
  };

  return { ...events, kills: sortedByTick(events.kills, kill, (item) => item.tick) };
}

export function withDamage(events: MatchEvents, overrides: Partial<Damage> = {}): MatchEvents {
  const damage: Damage = {
    tick: asTick(0),
    attacker: asPlayerSlot(0),
    victim: asPlayerSlot(1),
    weapon: 'ak47',
    healthDamage: 27,
    armorDamage: 5,
    hitGroup: 'chest',
    ...overrides,
  };

  return { ...events, damage: sortedByTick(events.damage, damage, (item) => item.tick) };
}

export function withBlind(events: MatchEvents, overrides: Partial<Blind> = {}): MatchEvents {
  const blind: Blind = {
    tick: asTick(0),
    victim: asPlayerSlot(1),
    attacker: asPlayerSlot(0),
    durationSeconds: 2,
    isTeammate: false,
    ...overrides,
  };

  return { ...events, blinds: sortedByTick(events.blinds, blind, (item) => item.tick) };
}

export function withDefuse(events: MatchEvents, overrides: Partial<BombDefuse> = {}): MatchEvents {
  const defuse: BombDefuse = {
    startTick: asTick(0),
    defuser: asPlayerSlot(0),
    hasKit: false,
    outcome: { status: 'interrupted' },
    ...overrides,
  };

  return {
    ...events,
    defuses: sortedByTick(events.defuses, defuse, (item) => item.startTick),
  };
}

export function withShot(events: MatchEvents, overrides: Partial<Shot> = {}): MatchEvents {
  const shot: Shot = {
    tick: asTick(0),
    shooter: asPlayerSlot(0),
    weapon: WEAPON_NONE,
    ...overrides,
  };

  return { ...events, shots: sortedByTick(events.shots, shot, (item) => item.tick) };
}

function emptyTrajectory(firstTick: Tick): GrenadeTrajectory {
  return {
    sampleHz: DEFAULT_SAMPLE_HZ,
    firstTick,
    sampleCount: 0,
    x: new Float32Array(0),
    y: new Float32Array(0),
    z: new Float32Array(0),
  };
}

export function withGrenade(events: MatchEvents, overrides: Partial<Grenade> = {}): MatchEvents {
  const grenade: Grenade = {
    thrower: asPlayerSlot(0),
    type: 'smokegrenade',
    throwTick: asTick(0),
    detonationTick: null,
    detonationPosition: null,
    expiryTick: null,
    trajectory: emptyTrajectory(asTick(0)),
    ...overrides,
  };

  return { ...events, grenades: sortedByTick(events.grenades, grenade, (item) => item.throwTick) };
}
