import { readdir } from 'node:fs/promises';
import { type KeyValues, parseKeyValues } from './mapdata/keyvalues';
import { readPngSize } from './mapdata/png';
import { recolorToBlue } from './mapdata/recolor';

const PACKAGE_DIR = 'packages/map-data';
const OVERVIEW_DIR = `${PACKAGE_DIR}/assets/overviews`;
const RADAR_DIR = `${PACKAGE_DIR}/assets/radar`;
const VANILLA_DIR = `${RADAR_DIR}/vanilla`;
const OUTPUT_PATH = `${PACKAGE_DIR}/src/generated/overviews.ts`;

interface Level {
  image: string;
  altitudeMax: number;
  altitudeMin: number;
}

interface Overview {
  id: string;
  posX: number;
  posY: number;
  scale: number;
  rotate: number;
  zoom: number;
  levels: Level[];
}

/** Valve's own bounds for a map that declares no `verticalsections`. */
const WHOLE_WORLD = { altitudeMax: 10_000, altitudeMin: -10_000 };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function asNumber(block: KeyValues, key: string, source: string, fallback?: number): number {
  const raw = block[key];
  if (raw === undefined) {
    if (fallback !== undefined) return fallback;
    fail(`${source}: "${key}" is missing`);
  }
  if (typeof raw !== 'string') fail(`${source}: "${key}" is a block, expected a value`);

  const value = Number(raw.trim());
  if (!Number.isFinite(value)) fail(`${source}: "${key}" is "${raw}", which is not a number`);
  return value;
}

function readLevels(id: string, block: KeyValues, source: string): Level[] {
  const sections = block.verticalsections;
  if (sections === undefined) return [{ image: id, ...WHOLE_WORLD }];
  if (typeof sections === 'string')
    fail(`${source}: "verticalsections" is a value, expected a block`);

  const levels = Object.entries(sections).map(([name, section]) => {
    if (typeof section === 'string')
      fail(`${source}: section "${name}" is a value, expected a block`);
    return {
      image: name === 'default' ? id : `${id}_${name}`,
      altitudeMax: asNumber(section, 'AltitudeMax', `${source} → ${name}`),
      altitudeMin: asNumber(section, 'AltitudeMin', `${source} → ${name}`),
    };
  });

  const [first] = levels;
  if (first === undefined) fail(`${source}: "verticalsections" is empty`);

  // The default level must lead: it is what `radarLevelAt` falls back to.
  return [...levels].sort((a, b) => Number(a.image !== id) - Number(b.image !== id));
}

async function readOverview(file: string): Promise<Overview> {
  const source = `${OVERVIEW_DIR}/${file}`;
  const id = file.replace(/\.txt$/, '');
  const root = parseKeyValues(await Bun.file(source).text());

  const block = root[id];
  if (block === undefined) fail(`${source}: no top-level "${id}" block`);
  if (typeof block === 'string') fail(`${source}: "${id}" is a value, expected a block`);

  return {
    id,
    posX: asNumber(block, 'pos_x', source),
    posY: asNumber(block, 'pos_y', source),
    scale: asNumber(block, 'scale', source),
    // Absent on maps that need neither — Nuke declares no rotation, Ancient declares zero.
    rotate: asNumber(block, 'rotate', source, 0),
    zoom: asNumber(block, 'zoom', source, 0),
    levels: readLevels(id, block, source),
  };
}

/**
 * Every radar image must be square and the same size as every other, because the renderer treats
 * `RADAR_IMAGE_SIZE` as one number for all maps. A map that breaks that stops the generator rather
 * than shipping a silently misplaced overlay.
 */
async function measureImage(path: string, declaredBy: string): Promise<number> {
  const file = Bun.file(path);
  if (!(await file.exists())) fail(`${path} is missing — ${declaredBy} declares that level`);

  const { width, height } = readPngSize(new Uint8Array(await file.arrayBuffer()));
  if (width !== height) fail(`${path} is ${width}x${height}, expected a square image`);
  return width;
}

async function measureImages(overviews: Overview[]): Promise<number> {
  let shared: { size: number; path: string } | undefined;

  for (const overview of overviews) {
    for (const level of overview.levels) {
      const path = `${VANILLA_DIR}/${level.image}.png`;
      const size = await measureImage(path, overview.id);

      shared ??= { size, path };
      if (size !== shared.size)
        fail(`${path} is ${size} px wide but ${shared.path} is ${shared.size} px`);
    }
  }

  if (shared === undefined) fail(`${VANILLA_DIR} holds no radar images`);
  return shared.size;
}

function renderLevel(level: Level): string {
  return [
    '      {',
    `        image: '${level.image}',`,
    `        altitudeMax: ${level.altitudeMax},`,
    `        altitudeMin: ${level.altitudeMin},`,
    '      },',
  ].join('\n');
}

function renderOverview(overview: Overview): string {
  return [
    `  ${overview.id}: {`,
    `    id: '${overview.id}',`,
    `    posX: ${overview.posX},`,
    `    posY: ${overview.posY},`,
    `    scale: ${overview.scale},`,
    `    rotate: ${overview.rotate},`,
    `    zoom: ${overview.zoom},`,
    '    levels: [',
    overview.levels.map(renderLevel).join('\n'),
    '    ],',
    '  },',
  ].join('\n');
}

function render(overviews: Overview[], imageSize: number): string {
  return [
    '// Generated by `bun run mapdata:generate` from packages/map-data/assets/overviews.',
    '// Valve owns these numbers; edit the overview files, not this one.',
    '',
    "import type { MapOverview } from '../types';",
    '',
    '/** Measured off the shipped images, which the generator requires to be square and uniform. */',
    `export const RADAR_IMAGE_SIZE = ${imageSize};`,
    '',
    'export const MAP_IDS = [',
    ...overviews.map((overview) => `  '${overview.id}',`),
    '] as const;',
    '',
    'export type MapId = (typeof MAP_IDS)[number];',
    '',
    'export const MAP_OVERVIEWS: Readonly<Record<MapId, MapOverview>> = {',
    ...overviews.map(renderOverview),
    '};',
    '',
  ].join('\n');
}

const files = (await readdir(OVERVIEW_DIR)).filter((file) => file.endsWith('.txt')).sort();
if (files.length === 0) fail(`${OVERVIEW_DIR} holds no overview files`);

const overviews: Overview[] = [];
for (const file of files) overviews.push(await readOverview(file));

const imageSize = await measureImages(overviews);
await Bun.write(OUTPUT_PATH, render(overviews, imageSize));

const images = overviews.flatMap((overview) => overview.levels.map((level) => level.image));
for (const image of images) {
  const source = await Bun.file(`${VANILLA_DIR}/${image}.png`).arrayBuffer();
  await Bun.write(`${RADAR_DIR}/blue/${image}.png`, recolorToBlue(new Uint8Array(source)));
}

console.log(`${OUTPUT_PATH}: ${overviews.length} maps, ${images.length} radar levels.`);
console.log(`${RADAR_DIR}/blue: ${images.length} images recoloured.`);
