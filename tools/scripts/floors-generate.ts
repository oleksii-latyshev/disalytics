import { writeFileSync } from 'node:fs';
import { FLAG_ALIVE, type ParsedDemo } from '@disa/demo-core';
import { decodeDemo } from '@disa/demo-store/codec';
import { SAMPLE_MATCHES } from '../../apps/web/src/core/samples/helpers/catalogue';
import { EXTRA_FLOORS, floorAtRadar, mapFloors } from '../../packages/map-data/src/floors';
import { FLOOR_DATA } from '../../packages/map-data/src/generated/floors';
import {
  MAP_OVERVIEWS,
  type MapId,
  RADAR_IMAGE_SIZE,
} from '../../packages/map-data/src/generated/overviews';
import { isMapId, radarX, radarY } from '../../packages/map-data/src/transform';
import type { MapFloorData, MapOverview, NavConnector } from '../../packages/map-data/src/types';
import {
  type Crossing,
  closeTrace,
  clusterConnectors,
  MAX_CROSSING_STEP_UNITS,
} from './floors/connectors';
import { containersIn, readContainer } from './floors/containers';
import { packBits } from './navgrid/trace';

/**
 * Writes where the floors of a map join, from parsed containers.
 *
 *     bun run floors:generate
 *     DISALYTICS_FLOOR_DIR=<dir of .disa / .disa.gz containers> bun run floors:generate
 *
 * Only maps with more than one floor (`mapFloors`) are read. The shipped samples are always read;
 * a map that no container names keeps what the committed file holds, and one that does is
 * recomputed from every container of that map, so a rerun over the same inputs changes nothing.
 * Containers are read, not `.dem` files — parse a demo into one with the app first.
 *
 * Per map it finds the *connectors*: places where a player stepped between floors in consecutive
 * 16 Hz frames, clustered and dropped when seen too rarely (`floors/connectors.ts`). For an
 * authored extra floor (`EXTRA_FLOORS`) it also writes the cells its tracks cover and the cells
 * the floor it shares pixels with covers inside the same region, which `navgrid:generate` turns
 * into the extra floor's grid and into a cut of the shared floor. The output is run through Biome,
 * so it stays as the repository formats it.
 */
const OUTPUT_PATH = 'packages/map-data/src/generated/floors.ts';
const SAMPLE_DIR = 'apps/web/assets/samples';
const EXTRA_ENV = 'DISALYTICS_FLOOR_DIR';
const CELL = 4;
const CELLS = RADAR_IMAGE_SIZE / CELL;

function containerPaths(): string[] {
  const samples = SAMPLE_MATCHES.map((sample) => `${SAMPLE_DIR}/${sample.id}.disa.gz`);
  return [...samples, ...containersIn(process.env[EXTRA_ENV])];
}

type Track = ParsedDemo['track'];

function isAliveAt(track: Track, index: number): boolean {
  return ((track.flags[index] ?? 0) & FLAG_ALIVE) !== 0;
}

function radarOf(track: Track, overview: MapOverview, index: number): { x: number; y: number } {
  return {
    x: radarX(overview, track.posX[index] ?? 0),
    y: radarY(overview, track.posY[index] ?? 0),
  };
}

function floorOf(track: Track, overview: MapOverview, index: number): number {
  const at = radarOf(track, overview, index);
  return floorAtRadar(overview, at.x, at.y, track.posZ[index] ?? 0);
}

/** The step of one player between two samples, if it is a walk onto another floor. */
function crossingBetween(
  track: Track,
  overview: MapOverview,
  before: number,
  after: number,
): Crossing | undefined {
  if (!isAliveAt(track, before) || !isAliveAt(track, after)) return undefined;

  const from = floorOf(track, overview, before);
  const to = floorOf(track, overview, after);
  const step = Math.hypot(
    (track.posX[after] ?? 0) - (track.posX[before] ?? 0),
    (track.posY[after] ?? 0) - (track.posY[before] ?? 0),
  );
  if (from === to || step > MAX_CROSSING_STEP_UNITS) return undefined;

  return {
    from,
    to,
    leftAt: radarOf(track, overview, before),
    arrivedAt: radarOf(track, overview, after),
  };
}

function crossingsOf(demo: ParsedDemo, overview: MapOverview): Crossing[] {
  const { track } = demo;
  const slots = track.slotCount;
  const frames = Math.floor(track.posX.length / slots);
  const found: Crossing[] = [];

  for (let slot = 0; slot < slots; slot++) {
    for (let frame = 1; frame < frames; frame++) {
      const crossing = crossingBetween(
        track,
        overview,
        (frame - 1) * slots + slot,
        frame * slots + slot,
      );
      if (crossing !== undefined) found.push(crossing);
    }
  }
  return found;
}

interface Stats {
  readonly zs: number[];
}

interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function isInRegion(at: { x: number; y: number }, region: Region | undefined): boolean {
  return (
    region === undefined ||
    (at.x >= region.x &&
      at.y >= region.y &&
      at.x < region.x + region.width &&
      at.y < region.y + region.height)
  );
}

/** Cells covered by the alive samples of `floor`, inside `region` when given. */
function occupancyOf(
  demo: ParsedDemo,
  overview: MapOverview,
  floor: number,
  grid: Uint8Array,
  stats: Stats,
  region: Region | undefined,
): void {
  const { track } = demo;
  for (let i = 0; i < track.posX.length; i++) {
    if (!isAliveAt(track, i) || floorOf(track, overview, i) !== floor) continue;
    const at = radarOf(track, overview, i);
    const cx = Math.floor(at.x / CELL);
    const cy = Math.floor(at.y / CELL);
    if (!isInRegion(at, region) || cx < 0 || cy < 0 || cx >= CELLS || cy >= CELLS) continue;
    grid[cy * CELLS + cx] = 1;
    stats.zs.push(track.posZ[i] ?? 0);
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 0;
}

const demosByMap = new Map<MapId, ParsedDemo[]>();
for (const path of containerPaths()) {
  const demo = decodeDemo(readContainer(path));
  const map = demo.header.map;
  if (!isMapId(map) || mapFloors(MAP_OVERVIEWS[map]).length < 2) continue;
  demosByMap.set(map, [...(demosByMap.get(map) ?? []), demo]);
  console.log(`${path}: ${map}`);
}

const computed = new Map<MapId, MapFloorData>();
for (const [map, demos] of demosByMap) {
  const overview = MAP_OVERVIEWS[map];
  const floors = mapFloors(overview);

  const found = clusterConnectors(demos.flatMap((demo) => crossingsOf(demo, overview)));
  for (const { connector, count } of found) {
    const { a, b } = connector;
    console.log(
      `  ${map} connector ${a.floor}(${a.x},${a.y}) -> ${b.floor}(${b.x},${b.y})` +
        `${connector.isOneWay === true ? ' one-way' : ''}, ${count} crossings`,
    );
  }

  const masks: Record<string, { own: string; shared: string }> = {};
  for (const extra of EXTRA_FLOORS[map] ?? []) {
    const index = floors.findIndex((floor) => floor.id === extra.id && floor.isExtra);
    const own = new Uint8Array(CELLS * CELLS);
    const shared = new Uint8Array(CELLS * CELLS);
    const ownStats: Stats = { zs: [] };
    const sharedStats: Stats = { zs: [] };
    for (const demo of demos) {
      occupancyOf(demo, overview, index, own, ownStats, undefined);
      occupancyOf(demo, overview, extra.level, shared, sharedStats, extra.region);
    }
    masks[extra.id] = {
      own: Buffer.from(packBits(closeTrace(own, CELLS))).toString('base64'),
      shared: Buffer.from(packBits(closeTrace(shared, CELLS))).toString('base64'),
    };
    console.log(
      `  ${map} ${extra.id}: ${ownStats.zs.length} samples, median z ${Math.round(median(ownStats.zs))}` +
        `; shared floor in the region: ${sharedStats.zs.length} samples, median z ${Math.round(median(sharedStats.zs))}`,
    );
  }

  computed.set(map, {
    connectors: found.map((entry) => entry.connector),
    ...(Object.keys(masks).length > 0 ? { masks } : {}),
  });
}

function emitPoint(point: NavConnector['a']): string {
  return `{ floor: ${point.floor}, x: ${point.x}, y: ${point.y} }`;
}

function emitMap(map: string, data: MapFloorData): string {
  const connectors = data.connectors
    .map(
      (c) =>
        `      { a: ${emitPoint(c.a)}, b: ${emitPoint(c.b)}${c.isOneWay === true ? ', isOneWay: true' : ''} },\n`,
    )
    .join('');
  const masks = Object.entries(data.masks ?? {})
    .sort(([p], [q]) => p.localeCompare(q))
    .map(
      ([id, mask]) =>
        `        ${id}: {\n          own: '${mask.own}',\n          shared: '${mask.shared}',\n        },\n`,
    )
    .join('');
  const maskBlock = masks === '' ? '' : `      masks: {\n${masks}      },\n`;
  return `  ${map}: {\n    connectors: [\n${connectors}    ],\n${maskBlock}  },\n`;
}

const merged = new Map<string, MapFloorData>(Object.entries(FLOOR_DATA));
for (const [map, data] of computed) merged.set(map, data);
const body = [...merged.keys()]
  .sort()
  .map((map) => {
    const data = merged.get(map);
    return data === undefined ? '' : emitMap(map, data);
  })
  .join('');

writeFileSync(
  OUTPUT_PATH,
  `// Generated by \`bun run floors:generate\` from parsed matches. Edit the inputs, not this file.
// Read by \`navgrid:generate\` only; the app loads the connectors from each map's nav grid.

import type { MapFloorData } from '../types';
import type { MapId } from './overviews';

export const FLOOR_DATA: Readonly<Partial<Record<MapId, MapFloorData>>> = {
${body}};
`,
);

const formatted = Bun.spawnSync(['bunx', 'biome', 'check', '--write', OUTPUT_PATH]);
if (formatted.exitCode !== 0) throw new Error(`biome could not format ${OUTPUT_PATH}`);

for (const [map, data] of [...merged.entries()].sort(([p], [q]) => p.localeCompare(q))) {
  console.log(`${map}: ${data.connectors.length} connector(s)`);
}
