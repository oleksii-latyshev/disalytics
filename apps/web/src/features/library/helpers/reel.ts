import { sampleAt } from '@disa/demo-core';
import { getMapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import { AGENT_STRIDE, PLAYER_AGENTS, UTILITY_AGENTS } from './agents';

/**
 * One round of recorded play, small enough to ship inside the bundle.
 *
 * **It is a parse of a parse.** `bun run reel:generate` reads the committed sample container — the
 * same bytes the library hands the store on a press — and takes ten position tracks and every
 * grenade's detonation out of it. So no `.dem` is involved at any point and none has to be: the
 * chain is `.dem` → container → reel, and the container is already in the tree.
 *
 * **The numbers are world units, not map units**, quantised on a grid that belongs to no map. The
 * alternative was storing the radar UV the shader wants, and it would have tied these bytes to
 * `map-data`'s overview constants — a `mapdata:generate` that moved `posX` would leave the reel
 * silently wrong rather than visibly stale. Converting here means the transform has one owner, the
 * same `radarX`/`radarY` the plate reads, and it runs once per mount rather than once per frame.
 */
export interface ReelGrenade {
  type: string;
  /** Reel frames, from the round's freeze-time end. */
  detonateFrame: number;
  /** When the mark is spent: an area's own expiry, a burst's short life. */
  endFrame: number;
  /** Quantised world units, `quantOrigin` / `quantUnits` below. */
  x: number;
  y: number;
}

export interface ReelSource {
  /** Game vocabulary — and the map the field draws, so the two cannot disagree. */
  map: string;
  /** The round's own number, for tracing the asset back to the match it came from. */
  round: number;
  hz: number;
  frameCount: number;
  /** The fullest frame of the round — what a reader who asked for less motion is shown. */
  stillFrame: number;
  slotCount: number;
  /** World units at quantised zero, and steps per world unit. */
  quantOrigin: number;
  quantUnits: number;
  /**
   * Ten position tracks as a running difference, laid out `[slot][axis][frame]`. Player-major
   * because a player's own next sample is the one that resembles it, and differenced because a step
   * at this rate is tens of units where a position is thousands: 3.51 kB gzipped against 6.28 kB
   * for the same tracks undifferenced.
   */
  positions: readonly number[];
  /** One bit per slot per frame, `slot * frameCount + frame`. */
  alive: readonly number[];
  grenades: readonly ReelGrenade[];
}

/** In UV, so a fraction of the map's own width. A player is a little wider than one cell. */
const PLAYER_RADIUS = 0.012;

/** An area sits where a cloud would; a burst is the flash or the shell, and is smaller and brief. */
const AREA_RADIUS = 0.045;
const BURST_RADIUS = 0.03;

/** Frames of reel over which a mark reaches its size. A detonation is quick and then it lingers. */
const BLOOM_FRAMES = 1.5;

const AREA_TYPES = new Set(['smokegrenade', 'molotov', 'incgrenade']);

export interface Reel {
  map: string;
  round: number;
  hz: number;
  frameCount: number;
  stillFrame: number;
  slotCount: number;
  /** Radar UV, `[slot * frameCount + frame]`. */
  x: Float32Array;
  y: Float32Array;
  alive: Uint8Array;
  grenades: readonly ReelGrenade[];
  /** Radar UV, one per grenade, in `grenades` order. */
  grenadeX: Float32Array;
  grenadeY: Float32Array;
}

/** The inverse of the generator's transform: a running sum along each series. */
function unpack(deltas: readonly number[], seriesCount: number, frameCount: number): Uint16Array {
  const values = new Uint16Array(seriesCount * frameCount);

  for (let series = 0; series < seriesCount; series += 1) {
    const base = series * frameCount;
    let running = 0;

    for (let frame = 0; frame < frameCount; frame += 1) {
      running += sampleAt(deltas, base + frame);
      values[base + frame] = running;
    }
  }

  return values;
}

/**
 * The reel as the field wants it: radar UV, decoded once.
 *
 * `null` for a map `map-data` does not carry, which is a background that cannot be drawn rather
 * than a failure — the way in falls back to the still map it drew before this.
 */
export function decodeReel(source: ReelSource): Reel | null {
  const overview = getMapOverview(source.map);
  if (overview === undefined) return null;

  const { frameCount, slotCount, quantOrigin, quantUnits } = source;
  const packed = unpack(source.positions, slotCount * 2, frameCount);
  const world = (value: number) => value / quantUnits + quantOrigin;
  const u = (value: number) => radarX(overview, world(value)) / RADAR_IMAGE_SIZE;
  const v = (value: number) => radarY(overview, world(value)) / RADAR_IMAGE_SIZE;

  const x = new Float32Array(slotCount * frameCount);
  const y = new Float32Array(slotCount * frameCount);

  for (let slot = 0; slot < slotCount; slot += 1) {
    for (let frame = 0; frame < frameCount; frame += 1) {
      x[slot * frameCount + frame] = u(sampleAt(packed, (slot * 2 + 0) * frameCount + frame));
      y[slot * frameCount + frame] = v(sampleAt(packed, (slot * 2 + 1) * frameCount + frame));
    }
  }

  const grenadeX = new Float32Array(source.grenades.length);
  const grenadeY = new Float32Array(source.grenades.length);

  for (const [at, grenade] of source.grenades.entries()) {
    grenadeX[at] = u(grenade.x);
    grenadeY[at] = v(grenade.y);
  }

  return {
    map: source.map,
    round: source.round,
    hz: source.hz,
    frameCount,
    stillFrame: source.stillFrame,
    slotCount,
    x,
    y,
    alive: Uint8Array.from(source.alive),
    grenades: source.grenades,
    grenadeX,
    grenadeY,
  };
}

function isAlive(reel: Reel, slot: number, frame: number): boolean {
  const bit = slot * reel.frameCount + frame;

  return (sampleAt(reel.alive, bit >> 3) & (1 << (bit & 7))) !== 0;
}

/** How much of a mark is on screen at `frame`: up over its bloom, then down to nothing at its end. */
function grenadeStrength(grenade: ReelGrenade, frame: number): number {
  if (frame < grenade.detonateFrame || frame > grenade.endFrame) return 0;

  const risen = Math.min(1, (frame - grenade.detonateFrame) / BLOOM_FRAMES);
  const life = Math.max(1, grenade.endFrame - grenade.detonateFrame);
  const left = 1 - (frame - grenade.detonateFrame) / life;

  return risen * Math.max(0, left);
}

/**
 * Where everything is at `seconds` into the round, written into the caller's array.
 *
 * **Nothing here allocates**: this runs once an animation frame beneath a shader, which is the rule
 * `PixelBackdrop`'s own uniforms already obey. The reel loops on its own length, so the round plays
 * again rather than the field going still.
 */
export function sampleReel(reel: Reel, seconds: number, out: Float32Array): void {
  out.fill(0);

  const position = (((seconds * reel.hz) % reel.frameCount) + reel.frameCount) % reel.frameCount;
  const frame = Math.floor(position);
  const next = (frame + 1) % reel.frameCount;
  const blend = position - frame;

  for (let slot = 0; slot < reel.slotCount && slot < PLAYER_AGENTS; slot += 1) {
    const base = slot * reel.frameCount;
    const at = slot * AGENT_STRIDE;
    // A dead player leaves rather than being drawn where they fell: this is the way in, and the
    // field says the round is being played, not what its scoreboard came to.
    const living = isAlive(reel, slot, frame);

    const fromX = sampleAt(reel.x, base + frame);
    const fromY = sampleAt(reel.y, base + frame);

    out[at + 0] = fromX + (sampleAt(reel.x, base + next) - fromX) * blend;
    out[at + 1] = fromY + (sampleAt(reel.y, base + next) - fromY) * blend;
    out[at + 2] = living ? 1 : 0;
    out[at + 3] = PLAYER_RADIUS;
  }

  let taken = 0;

  for (const [index, grenade] of reel.grenades.entries()) {
    if (taken >= UTILITY_AGENTS) break;

    const strength = grenadeStrength(grenade, position);
    if (strength <= 0) continue;

    const at = (PLAYER_AGENTS + taken) * AGENT_STRIDE;
    out[at + 0] = sampleAt(reel.grenadeX, index);
    out[at + 1] = sampleAt(reel.grenadeY, index);
    out[at + 2] = strength;
    out[at + 3] = AREA_TYPES.has(grenade.type) ? AREA_RADIUS : BURST_RADIUS;
    taken += 1;
  }
}
