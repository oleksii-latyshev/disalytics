import { sampleAt } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';
import { POSITION_STRIDE } from '@/core/playback';
import { levelIndexAt, OTHER_LEVEL_ALPHA } from './levels';

/** Screen `x`, screen `y` and the level's opacity, per slot. */
const SCREEN_STRIDE = 3;

export interface PlateProjection {
  /** Turns a frame's interpolated positions into the screen coordinates every pass draws at. */
  readonly read: (positions: Float32Array, scale: number) => void;
  readonly x: (slot: number) => number;
  readonly y: (slot: number) => number;
  /** 1 on the level being read, and OTHER_LEVEL_ALPHA on any other — DESIGN.md §6.3. */
  readonly alpha: (slot: number) => number;
}

/**
 * Where every player is on the plate this frame, separately from what their token then carries.
 *
 * The scratch it writes into is owned here and built once, for the reason `positionScratch` is:
 * nothing on the way to the canvas allocates.
 */
export function plateProjection(
  overview: MapOverview,
  levelIndex: number,
  slotCount: number,
): PlateProjection {
  const screen = new Float32Array(slotCount * SCREEN_STRIDE);

  return {
    read: (positions, scale) => {
      for (let slot = 0; slot < slotCount; slot++) {
        const offset = slot * POSITION_STRIDE;
        const target = slot * SCREEN_STRIDE;

        screen[target] = radarX(overview, sampleAt(positions, offset)) * scale;
        screen[target + 1] = radarY(overview, sampleAt(positions, offset + 1)) * scale;
        screen[target + 2] =
          levelIndexAt(overview, sampleAt(positions, offset + 2)) === levelIndex
            ? 1
            : OTHER_LEVEL_ALPHA;
      }
    },
    x: (slot) => sampleAt(screen, slot * SCREEN_STRIDE),
    y: (slot) => sampleAt(screen, slot * SCREEN_STRIDE + 1),
    alpha: (slot) => sampleAt(screen, slot * SCREEN_STRIDE + 2),
  };
}
