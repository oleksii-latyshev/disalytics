import type { MapId } from './generated/overviews';
import { plateLayout, plateLevelIndex } from './layout';
import type { NavRect } from './navgrid-overrides';
import { radarX, radarY } from './transform';
import type { MapOverview } from './types';

export type FloorId = 'main' | 'upper' | 'lower' | 'underpass';

/**
 * One piece of ground a route can be on. The first floors are the overview's levels, in
 * `MapOverview.levels` order; authored extra floors follow. Every floor is drawn on one of the
 * overview's radar images (`level`), so a plate shows one floor at a time over the same pixels.
 */
export interface MapFloor {
  readonly id: FloorId;
  /** Index into `MapOverview.levels` of the image this floor is drawn on. */
  readonly level: number;
  /** A representative altitude: a point created on this floor takes it, and `floorAt` reads it back as this floor. */
  readonly refZ: number;
  readonly isExtra: boolean;
}

/**
 * A floor the overview's levels do not split out: ground that shares pixels with the floor above
 * it on the one radar image. It is the part of `region` (radar px of that image) below `belowZ`.
 */
interface ExtraFloor {
  readonly id: FloorId;
  readonly level: number;
  readonly belowZ: number;
  readonly region: NavRect;
  readonly refZ: number;
  readonly note: string;
}

/**
 * Authored from real tracks (`bun run floors:generate` reports the figures). Add a floor only
 * where the radar image draws two pieces of ground over the same pixels and the overview has no
 * level for the lower one.
 */
export const EXTRA_FLOORS: Readonly<Partial<Record<MapId, readonly ExtraFloor[]>>> = {
  de_mirage: [
    {
      id: 'underpass',
      level: 0,
      belowZ: -230,
      region: { x: 425, y: 235, width: 215, height: 300 },
      refZ: -274,
      note:
        'The L under Mid that climbs to B apartments: tracks there sit at z -380 to -250 against ' +
        '-180 on the walkways above, with almost nothing between (the trough is at -230). Low ' +
        'ground elsewhere on Mirage is the main floor, so the region keeps the split to the L.',
    },
  ],
};

/** Altitude a point on each overview level takes, from the median of observed tracks. */
const LEVEL_REF_Z: Readonly<Partial<Record<MapId, readonly number[]>>> = {
  de_nuke: [-416, -640],
  de_mirage: [-168],
};

const DEFAULT_REF_Z = 0;

const cache = new WeakMap<MapOverview, readonly MapFloor[]>();

/** The floors of a map: its overview levels, then its authored extras. A map with one has one. */
export function mapFloors(overview: MapOverview): readonly MapFloor[] {
  const cached = cache.get(overview);
  if (cached !== undefined) return cached;

  const { slots } = plateLayout(overview);
  const refs = LEVEL_REF_Z[overview.id] ?? [];
  const floors: MapFloor[] = overview.levels.map((_, level) => ({
    id: slots[level]?.floor ?? 'main',
    level,
    refZ: refs[level] ?? DEFAULT_REF_Z,
    isExtra: false,
  }));
  for (const extra of EXTRA_FLOORS[overview.id] ?? []) {
    floors.push({ id: extra.id, level: extra.level, refZ: extra.refZ, isExtra: true });
  }

  cache.set(overview, floors);
  return floors;
}

/** The extra floor a radar pixel at altitude `z` is on, as its position in `mapFloors`, or -1. */
function extraFloorAt(overview: MapOverview, rx: number, ry: number, z: number): number {
  const extras = EXTRA_FLOORS[overview.id];
  if (extras === undefined) return -1;

  for (const [index, extra] of extras.entries()) {
    const { region } = extra;
    const isInside =
      rx >= region.x &&
      rx < region.x + region.width &&
      ry >= region.y &&
      ry < region.y + region.height;
    if (isInside && z <= extra.belowZ) return overview.levels.length + index;
  }
  return -1;
}

/** `floorAt` for a point already in radar pixels of the overview. */
export function floorAtRadar(
  overview: MapOverview,
  rx: number,
  ry: number,
  z: number | undefined,
): number {
  if (z === undefined) return 0;
  const extra = extraFloorAt(overview, rx, ry, z);
  return extra >= 0 ? extra : plateLevelIndex(overview, z);
}

/**
 * The floor of a world point, as its position in `mapFloors`. A point without an altitude is on
 * floor 0, which is how a tactic saved before floors existed reads.
 */
export function floorAt(
  overview: MapOverview,
  worldX: number,
  worldY: number,
  z: number | undefined,
): number {
  if (z === undefined) return 0;
  return floorAtRadar(overview, radarX(overview, worldX), radarY(overview, worldY), z);
}

/** The altitude a point created on `floor` is given; floor 0's for a floor the map does not have. */
export function floorRefZ(overview: MapOverview, floor: number): number {
  const floors = mapFloors(overview);
  return (floors[floor] ?? floors[0])?.refZ ?? DEFAULT_REF_Z;
}
