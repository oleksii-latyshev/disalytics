import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { FLAG_ALIVE, type Grenade, type ParsedDemo, type Round, sampleAt } from '@disa/demo-core';
import { decodeDemo } from '@disa/demo-store/codec';
import {
  PLAYER_AGENTS,
  UTILITY_AGENTS,
} from '../../../apps/web/src/features/library/helpers/agents';

/**
 * The container the reel is cut from. It is the sample the library already ships, which is what
 * makes this script need no `.dem` at all: the chain is `.dem` → container → reel, and only the
 * first link is on the owner's machine. Dust2 because that is the plate the way in draws, and the
 * generated module carries the map so the two cannot drift apart.
 */
export const SOURCE_CONTAINER = 'apps/web/assets/samples/navi-vitality-dust2.disa.gz';

export const OUTPUT_PATH = 'apps/web/src/features/library/generated/reel.ts';

/**
 * Samples per second of match. Four is what makes a round of ten players affordable inside the
 * bundle — 8.8 kB before compression — and the field is a 10px grid, where a player crossing it
 * covers about one cell in that quarter second.
 */
const REEL_HZ = 4;

/**
 * The longest round the reel will take. It is a budget rather than a property of the match: the
 * round is what a reader watches on a loop, and #335's own figure for one is a minute.
 */
const MAX_ROUND_SECONDS = 60;

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
 * The round the reel plays: the busiest one that fits the budget.
 *
 * A rule rather than a number, so a regeneration reproduces the choice instead of trusting an index
 * somebody wrote down — and the generated module records which round it landed on, so a change of
 * mind is visible in the diff rather than silent.
 */
function chooseRound(demo: ParsedDemo): Round {
  const tickRate = demo.header.tickRate;
  const fits = demo.events.rounds.filter(
    (round) => (round.endTick - round.freezeTimeEndTick) / tickRate <= MAX_ROUND_SECONDS,
  );
  const pool = fits.length > 0 ? fits : demo.events.rounds;
  const density = (round: Round) =>
    demo.events.grenades.filter((grenade) => inRound(round, grenade.throwTick)).length;

  return pool.reduce((best, round) => (density(round) > density(best) ? round : best));
}

function quantise(value: number): number {
  return Math.max(0, Math.min(65535, Math.round((value - QUANT_ORIGIN) * QUANT_UNITS)));
}

/**
 * The bulk of the reel: a running difference along each player's own track.
 *
 * **A walk is small numbers, and small numbers are what gzip is good at** — a step at 4 Hz is tens
 * of units where a position is thousands. Measured on this round at this quantisation, the deltas
 * as a plain integer array gzip to **3.51 kB** against **3.77 kB** for the same numbers base64'd,
 * and the array needs no `atob` and no byte-plane split on the way back in: `decodeReel` is a
 * running sum and nothing else. The absolute positions, undifferenced, gzip to 6.28 kB.
 */
function packPositions(values: Uint16Array, seriesCount: number, frameCount: number): number[] {
  const deltas: number[] = [];

  for (let series = 0; series < seriesCount; series += 1) {
    const base = series * frameCount;
    let previous = 0;

    for (let frame = 0; frame < frameCount; frame += 1) {
      const value = sampleAt(values, base + frame);

      deltas.push(value - previous);
      previous = value;
    }
  }

  return deltas;
}

interface ReelGrenadeRow {
  type: string;
  detonateFrame: number;
  endFrame: number;
  x: number;
  y: number;
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

const GENERATED_DOC = `/**
 * One round of IEM Atlanta 2026, cut from the sample container this build already ships and small
 * enough to sit inside the bundle. Written by \`bun run reel:generate\`, held to the container it came
 * from by \`bun run reel:check\`.
 *
 * **It is in the bundle rather than beside it on purpose.** #330's rule for this screen is that
 * nothing is fetched before a reader presses something, and an asset imported with \`?url\` is a
 * request — so the reel is a module, and the way in still reaches the network for nothing at all.
 */`;

/**
 * The formatter's own answer for the file, rather than this script's guess at it.
 *
 * A generated file is checked by `bun run check` like any other, and the reel's bulk is an array of
 * four thousand numbers — whose wrapping is a fill algorithm, not a rule anything here should be
 * reimplementing. Asking Biome means a version of it that reflows arrays differently changes this
 * file the same way it changes a hand-written one, and `reel:check` stays a true comparison because
 * both sides come through here.
 */
function formatted(source: string): string {
  const run = Bun.spawnSync(
    ['bunx', '--bun', 'biome', 'format', `--stdin-file-path=${OUTPUT_PATH}`],
    {
      stdin: Buffer.from(source),
    },
  );

  if (run.exitCode !== 0) {
    throw new Error(`biome could not format the reel: ${run.stderr.toString()}`);
  }

  return run.stdout.toString();
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
  const grenades = rows.map(
    (row) =>
      `    { type: '${row.type}', detonateFrame: ${row.detonateFrame}, endFrame: ${row.endFrame}, x: ${row.x}, y: ${row.y} },`,
  );

  const source = [
    '// Generated by `bun run reel:generate`. Do not edit.',
    "import type { ReelSource } from '../helpers/reel';",
    '',
    GENERATED_DOC,
    'export const WAY_IN_REEL: ReelSource = {',
    `  map: '${header.map}',`,
    `  round: ${round.number},`,
    `  hz: ${REEL_HZ},`,
    `  frameCount: ${frameCount},`,
    `  stillFrame: ${stillFrame},`,
    `  slotCount: ${slotCount},`,
    `  quantOrigin: ${QUANT_ORIGIN},`,
    `  quantUnits: ${QUANT_UNITS},`,
    `  positions: [${packPositions(positions, slotCount * 2, frameCount).join(', ')}],`,
    `  alive: [${[...alive].join(', ')}],`,
    '  grenades: [',
    ...grenades,
    '  ],',
    '};',
    '',
  ].join('\n');

  const formattedSource = formatted(source);

  return {
    source: formattedSource,
    facts: {
      round: round.number,
      frameCount,
      stillFrame,
      grenadeCount: rows.length,
      peakUtility: peak,
      byteLength: Buffer.byteLength(formattedSource),
    },
  };
}
