import {
  asFrame,
  FLAG_ALIVE,
  type Frame,
  lastFrame,
  sampleAt,
  type TickTrack,
} from '@disa/demo-core';

/**
 * No player covers this much ground under their own power. Two samples further apart than one
 * sampling interval of it are a teleport — a round restart, a respawn — where holding the earlier
 * position is closer to the truth than sliding across the map.
 */
const TELEPORT_UNITS_PER_SECOND = 2000;

/** `x`, `y` and `z` per slot. */
export const POSITION_STRIDE = 3;

export function positionScratch(track: TickTrack): Float32Array {
  return new Float32Array(track.slotCount * POSITION_STRIDE);
}

/** The sample a fractional position sits on, or the nearest one a position outside the track has. */
function sampleUnder(frame: number, end: Frame): number {
  if (frame < 0) return 0;
  if (frame > end) return end;

  return Math.floor(frame);
}

/** How far the position has travelled from `start` towards the sample after it, in [0, 1]. */
function travelledRatio(frame: number, start: number, next: number): number {
  if (next === start) return 0;

  const offset = frame - start;
  if (offset < 0) return 0;

  return offset > 1 ? 1 : offset;
}

/**
 * Writes every slot's position at a fractional sample position into `out`, and answers with the
 * sample that the discrete columns — flags, health — are to be read from.
 */
// perf: called once per animation frame — no allocation, no closures, no iterators.
export function readPositions(track: TickTrack, frame: number, out: Float32Array): Frame {
  if (track.frameCount === 0) return asFrame(0);

  const end = lastFrame(track);
  const start = sampleUnder(frame, end);
  const next = start < end ? start + 1 : start;
  const ratio = travelledRatio(frame, start, next);

  const snapUnits = TELEPORT_UNITS_PER_SECOND / track.sampleHz;
  const snapUnitsSquared = snapUnits * snapUnits;
  const startBase = start * track.slotCount;
  const nextBase = next * track.slotCount;

  for (let slot = 0; slot < track.slotCount; slot++) {
    const a = startBase + slot;
    const b = nextBase + slot;

    let x = sampleAt(track.posX, a);
    let y = sampleAt(track.posY, a);
    let z = sampleAt(track.posZ, a);

    const isTravelling =
      ratio > 0 &&
      (sampleAt(track.flags, a) & FLAG_ALIVE) !== 0 &&
      (sampleAt(track.flags, b) & FLAG_ALIVE) !== 0;

    if (isTravelling) {
      const dx = sampleAt(track.posX, b) - x;
      const dy = sampleAt(track.posY, b) - y;
      const dz = sampleAt(track.posZ, b) - z;

      if (dx * dx + dy * dy + dz * dz <= snapUnitsSquared) {
        x += dx * ratio;
        y += dy * ratio;
        z += dz * ratio;
      }
    }

    const slotOffset = slot * POSITION_STRIDE;
    out[slotOffset] = x;
    out[slotOffset + 1] = y;
    out[slotOffset + 2] = z;
  }

  return asFrame(start);
}
