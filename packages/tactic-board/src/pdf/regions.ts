import { RADAR_IMAGE_SIZE } from '@disa/map-data';

/** A square of the plate in radar pixels, the part of a step's picture a throw is cropped from. */
export interface CropRegion {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface RegionPoint {
  readonly x: number;
  readonly y: number;
}

const MIN_SIZE = 240;
const MAX_SIZE = 520;
const FAR_SIZE = 400;
const MARGIN_FACTOR = 1.35;
const MARGIN_PX = 60;

function placed(centerX: number, centerY: number, size: number): CropRegion {
  const room = RADAR_IMAGE_SIZE - size;
  return {
    x: Math.round(Math.min(Math.max(centerX - size / 2, 0), room)),
    y: Math.round(Math.min(Math.max(centerY - size / 2, 0), room)),
    size,
  };
}

/**
 * The window that shows a throw: both ends of its arc when they fit a reasonable crop, otherwise
 * the landing spot alone, which is what a reader wants to see. Always inside the plate.
 */
export function throwRegion(from: RegionPoint, to: RegionPoint): CropRegion {
  const reach = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  const wanted = reach * MARGIN_FACTOR + MARGIN_PX;
  if (wanted > MAX_SIZE) return placed(to.x, to.y, FAR_SIZE);
  return placed((from.x + to.x) / 2, (from.y + to.y) / 2, Math.max(MIN_SIZE, Math.round(wanted)));
}
