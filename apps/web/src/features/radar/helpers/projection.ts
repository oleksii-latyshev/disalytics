import { sampleAt } from '@disa/demo-core';
import { type MapOverview, plateX, plateY } from '@disa/map-data';
import { POSITION_STRIDE } from '@/core/playback';

/** Screen `x` and screen `y`, per slot. */
const SCREEN_STRIDE = 2;

export interface PlateProjection {
  /** Turns a frame's interpolated positions into the screen coordinates every pass draws at. */
  readonly read: (positions: Float32Array, scale: number) => void;
  readonly x: (slot: number) => number;
  readonly y: (slot: number) => number;
}

/**
 * Where every player is on the plate this frame, on the floor their altitude puts them on, separately from what their token then carries.
 *
 * The scratch it writes into is owned here and built once, for the reason `positionScratch` is:
 * nothing on the way to the canvas allocates.
 */
export function plateProjection(overview: MapOverview, slotCount: number): PlateProjection {
  const screen = new Float32Array(slotCount * SCREEN_STRIDE);

  return {
    read: (positions, scale) => {
      for (let slot = 0; slot < slotCount; slot++) {
        const offset = slot * POSITION_STRIDE;
        const target = slot * SCREEN_STRIDE;

        const z = sampleAt(positions, offset + 2);

        screen[target] = plateX(overview, sampleAt(positions, offset), z) * scale;
        screen[target + 1] = plateY(overview, sampleAt(positions, offset + 1), z) * scale;
      }
    },
    x: (slot) => sampleAt(screen, slot * SCREEN_STRIDE),
    y: (slot) => sampleAt(screen, slot * SCREEN_STRIDE + 1),
  };
}
