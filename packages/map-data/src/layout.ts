import { type MapId, RADAR_IMAGE_SIZE } from './generated/overviews';
import type { MapOverview, PlateLayout, PlateSlot } from './types';

const NUKE_CROP = { x: 52, y: 268, width: 952, height: 512 } as const;
const NUKE_GAP = 16;

/**
 * Valve ships no stacked view, so this is authored: each Nuke floor is cropped to the band of its
 * image that holds the map (the content spans 63,280 to 999,771 on both), and the two crops are
 * stacked on one plate, upper floor first.
 */
const NUKE_LAYOUT: PlateLayout = {
  width: NUKE_CROP.width,
  height: NUKE_CROP.height * 2 + NUKE_GAP,
  slots: [
    {
      cropX: NUKE_CROP.x,
      cropY: NUKE_CROP.y,
      width: NUKE_CROP.width,
      height: NUKE_CROP.height,
      x: 0,
      y: 0,
      floor: 'upper',
    },
    {
      cropX: NUKE_CROP.x,
      cropY: NUKE_CROP.y,
      width: NUKE_CROP.width,
      height: NUKE_CROP.height,
      x: 0,
      y: NUKE_CROP.height + NUKE_GAP,
      floor: 'lower',
    },
  ],
};

const IDENTITY_SLOT: PlateSlot = {
  cropX: 0,
  cropY: 0,
  width: RADAR_IMAGE_SIZE,
  height: RADAR_IMAGE_SIZE,
  x: 0,
  y: 0,
  floor: null,
};

const IDENTITY_LAYOUT: PlateLayout = {
  width: RADAR_IMAGE_SIZE,
  height: RADAR_IMAGE_SIZE,
  slots: [IDENTITY_SLOT],
};

/** One image as it is — what every single-level map is drawn on, and what a lone image is shown on. */
export const SQUARE_PLATE_LAYOUT = IDENTITY_LAYOUT;

const AUTHORED_LAYOUTS: Readonly<Partial<Record<MapId, PlateLayout>>> = {
  de_nuke: NUKE_LAYOUT,
};

/** The plate a map is drawn on: its one image as it is, or its floors cropped and stacked. */
export function plateLayout(overview: MapOverview): PlateLayout {
  return AUTHORED_LAYOUTS[overview.id] ?? IDENTITY_LAYOUT;
}

/** Position in `overview.levels` of the level whose altitude band holds `z`, by `radarLevelAt`'s rule. */
export function plateLevelIndex(overview: MapOverview, z: number): number {
  const { levels } = overview;

  for (let index = 0; index < levels.length; index++) {
    const level = levels[index];
    if (level !== undefined && z <= level.altitudeMax && z > level.altitudeMin) return index;
  }

  return 0;
}

function slotAt(layout: PlateLayout, levelIndex: number): PlateSlot {
  return layout.slots[levelIndex] ?? IDENTITY_SLOT;
}

/** A world position's plate `x` — `radarX` shifted into the slot of the floor `z` is on. */
export function plateX(overview: MapOverview, worldX: number, z: number): number {
  const slot = slotAt(plateLayout(overview), plateLevelIndex(overview, z));

  return (worldX - overview.posX) / overview.scale - slot.cropX + slot.x;
}

/** A world position's plate `y` — see `plateX`. */
export function plateY(overview: MapOverview, worldY: number, z: number): number {
  const slot = slotAt(plateLayout(overview), plateLevelIndex(overview, z));

  return (overview.posY - worldY) / overview.scale - slot.cropY + slot.y;
}

/**
 * The inverse of `plateX`/`plateY` for a pointer: the image pixel under a plate point and the floor
 * it falls on. A point in the gap or past the plate belongs to the nearest floor.
 */
export function plateToRadar(
  overview: MapOverview,
  plateXValue: number,
  plateYValue: number,
): { x: number; y: number; levelIndex: number } {
  const { slots } = plateLayout(overview);
  let levelIndex = 0;
  let nearest = Number.POSITIVE_INFINITY;

  for (const [index, slot] of slots.entries()) {
    const gap = Math.max(slot.y - plateYValue, plateYValue - (slot.y + slot.height), 0);

    if (gap < nearest) {
      nearest = gap;
      levelIndex = index;
    }
  }

  const slot = slotAt(plateLayout(overview), levelIndex);

  return {
    x: plateXValue - slot.x + slot.cropX,
    y: plateYValue - slot.y + slot.cropY,
    levelIndex,
  };
}
