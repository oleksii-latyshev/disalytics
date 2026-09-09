import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { FLAG_ALIVE, type Grenade, type ParsedDemo, type Round, sampleAt } from '@disa/demo-core';
import { decodeDemo } from '@disa/demo-store/codec';
import {
  PLAYER_AGENTS,
  UTILITY_AGENTS,
} from '../../../apps/web/src/features/library/helpers/agents';
import { emitReel, type ReelCut, type ReelGrenadeRow } from './emit';

/**
 * The container the reel is cut from. It is the sample the library already ships, which is what
 * makes this script need no `.dem` at all: the chain is `.dem` → container → reel, and only the
 * first link is on the owner's machine. Dust2 because that is the plate the way in draws, and the
 * generated module carries the map so the two cannot drift apart.
 */
export const SOURCE_CONTAINER = 'apps/web/assets/samples/navi-vitality-dust2.disa.gz';

/**
 * Samples per second of match. Four is what makes a round of ten players affordable inside the
 * bundle — 8.8 kB before compression — and the field is a 10px grid, where a player crossing it
 * covers about one cell in that quarter second.
 */
const REEL_HZ = 4;

/**
 * World units at quantised zero, and steps per world unit. The grid belongs to no map, and the step
 * is set by what the field can show rather than by what a number can hold: one cell of the way in's
 * 10px grid is about 31 world units across, so a whole unit is already thirty times finer than the
 * square it will be drawn in. A quarter-unit step was measured against this one and cost 236 bytes
 * of bundle for precision nothing can display. Storing the radar uv the shader wants would have been
 * smaller still and would have tied these bytes to `map-data`'s overview constants.
 */
const QUANT_ORIGIN = -8192;
const QUANT_UNITS = 1;

/** Frames a flash or an HE stays on screen after it goes off. An area states its own end. */
const BURST_FRAMES = 5;

/** Frames an area lasts when the recording never said it stopped — #173: 11 smokes in 136 do not. */
const UNENDED_AREA_FRAMES = 60;

const AREA_TYPES = new Set(['smokegrenade', 'molotov', 'incgrenade', 'decoy']);

export interface ReelFacts {
  round: number;
  frameCount: number;
  stillFrame: number;
  grenadeCount: number;
  peakUtility: number;
  byteLength: number;
}

function inRound(round: Round, tick: number): boolean {
  return tick >= round.freezeTimeEndTick && tick <= round.endTick;
}

/**
 * The round the reel plays: the one with the most in it, and the longer of two that tie.
 *
 * A rule rather than an index somebody wrote down, so a regeneration reproduces the choice — and the
 * generated module records which round it landed on, so a change of mind shows up in the diff.
 *
 * **Events rather than grenades, and length as the tie-break**, which is the owner's steer of
 * 9 September 2026: a short round packed with utility is a screen of smoke where a long one is an
 * attack that goes somewhere, and the field is watched on a loop by somebody who is not being asked
 * to read it. On the shipped container three rounds tie at 47 events and the longest is 124.8 s.
 */
function chooseRound(demo: ParsedDemo): Round {
  const weight = (round: Round) =>
    demo.events.grenades.filter((grenade) => inRound(round, grenade.throwTick)).length +
    demo.events.kills.filter((kill) => inRound(round, kill.tick)).length;

  return demo.events.rounds.reduce((best, round) => {
    if (weight(round) !== weight(best)) return weight(round) > weight(best) ? round : best;

    return round.endTick - round.freezeTimeEndTick > best.endTick - best.freezeTimeEndTick
      ? round
      : best;
  });
}

function quantise(value: number): number {
  return Math.max(0, Math.min(65535, Math.round((value - QUANT_ORIGIN) * QUANT_UNITS)));
}

function grenadeRows(
  demo: ParsedDemo,
  round: Round,
  frameOf: (tick: number) => number,
  frameCount: number,
): ReelGrenadeRow[] {
  const rows: ReelGrenadeRow[] = [];

  for (const grenade of demo.events.grenades) {
    if (!inRound(round, grenade.throwTick)) continue;
    if (grenade.detonationTick === null || grenade.detonationPosition === null) continue;

    const detonateFrame = frameOf(grenade.detonationTick);
    if (detonateFrame < 0 || detonateFrame >= frameCount) continue;

    rows.push({
      type: grenade.type,
      detonateFrame,
      endFrame: endFrameOf(grenade, detonateFrame, frameOf),
      x: quantise(grenade.detonationPosition.x),
      y: quantise(grenade.detonationPosition.y),
    });
  }

  return rows;
}

function endFrameOf(
  grenade: Grenade,
  detonateFrame: number,
  frameOf: (tick: number) => number,
): number {
  if (!AREA_TYPES.has(grenade.type)) return detonateFrame + BURST_FRAMES;
  if (grenade.expiryTick === null) return detonateFrame + UNENDED_AREA_FRAMES;

  return Math.max(detonateFrame + BURST_FRAMES, frameOf(grenade.expiryTick));
}

function liveUtilityAt(rows: readonly ReelGrenadeRow[], frame: number): number {
  return rows.filter((row) => frame >= row.detonateFrame && frame <= row.endFrame).length;
}

function peakUtility(rows: readonly ReelGrenadeRow[], frameCount: number): number {
  let peak = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    peak = Math.max(peak, liveUtilityAt(rows, frame));
  }

  return peak;
}

/**
 * The one frame a reader who has asked for less motion is shown.
 *
 * Frame zero is the round's first, where ten players stand on two spawns and nothing has been
 * thrown — a still of it says nothing about what the product is for. This is the fullest moment
 * instead: the most marks on the map at once, players and utility counted together, which is a rule
 * the reel can carry rather than a frame number somebody liked.
 */
function chooseStillFrame(
  rows: readonly ReelGrenadeRow[],
  alive: Uint8Array,
  slotCount: number,
  frameCount: number,
): number {
  let best = 0;
  let bestCount = -1;

  for (let frame = 0; frame < frameCount; frame += 1) {
    let count = liveUtilityAt(rows, frame);

    for (let slot = 0; slot < slotCount; slot += 1) {
      const bit = slot * frameCount + frame;
      if ((sampleAt(alive, bit >> 3) & (1 << (bit & 7))) !== 0) count += 1;
    }

    if (count > bestCount) {
      bestCount = count;
      best = frame;
    }
  }

  return best;
}

export function buildReel(): { source: string; facts: ReelFacts } {
  const bytes = new Uint8Array(gunzipSync(readFileSync(SOURCE_CONTAINER)));
  const demo = decodeDemo(bytes);
  const { header, track } = demo;
  const round = chooseRound(demo);

  const trackFrameOf = (tick: number) => Math.round((tick / header.tickRate) * track.sampleHz);
  const step = track.sampleHz / REEL_HZ;
  const first = trackFrameOf(round.freezeTimeEndTick);
  const frameCount = Math.floor((trackFrameOf(round.endTick) - first) / step);
  const frameOf = (tick: number) => Math.round((trackFrameOf(tick) - first) / step);

  const slotCount = track.slotCount;
  if (slotCount > PLAYER_AGENTS) {
    throw new Error(`${slotCount} slots against ${PLAYER_AGENTS} the shader draws`);
  }

  const positions = new Uint16Array(slotCount * 2 * frameCount);
  const alive = new Uint8Array(Math.ceil((slotCount * frameCount) / 8));

  for (let slot = 0; slot < slotCount; slot += 1) {
    for (let frame = 0; frame < frameCount; frame += 1) {
      const at = (first + frame * step) * slotCount + slot;
      positions[(slot * 2 + 0) * frameCount + frame] = quantise(sampleAt(track.posX, at));
      positions[(slot * 2 + 1) * frameCount + frame] = quantise(sampleAt(track.posY, at));

      if ((sampleAt(track.flags, at) & FLAG_ALIVE) !== 0) {
        const bit = slot * frameCount + frame;
        alive[bit >> 3] = sampleAt(alive, bit >> 3) | (1 << (bit & 7));
      }
    }
  }

  const rows = grenadeRows(demo, round, frameOf, frameCount);
  const peak = peakUtility(rows, frameCount);
  if (peak > UTILITY_AGENTS) {
    throw new Error(`${peak} live grenades at once against ${UTILITY_AGENTS} the shader draws`);
  }

  const stillFrame = chooseStillFrame(rows, alive, slotCount, frameCount);
  const cut: ReelCut = {
    map: header.map,
    round: round.number,
    hz: REEL_HZ,
    frameCount,
    stillFrame,
    slotCount,
    quantOrigin: QUANT_ORIGIN,
    quantUnits: QUANT_UNITS,
    positions,
    alive,
    grenades: rows,
  };
  const source = emitReel(cut);

  return {
    source,
    facts: {
      round: round.number,
      frameCount,
      stillFrame,
      grenadeCount: rows.length,
      peakUtility: peak,
      byteLength: Buffer.byteLength(source),
    },
  };
}
