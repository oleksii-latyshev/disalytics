import { MAP_OVERVIEWS, radarX, radarY } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { POSITION_STRIDE } from '@/core/playback';
import { OTHER_LEVEL_ALPHA } from '../helpers/levels';
import { plateProjection } from '../helpers/projection';

const dust2 = MAP_OVERVIEWS.de_dust2;
const nuke = MAP_OVERVIEWS.de_nuke;

const UPPER_Z = 0;
const LOWER_Z = -600;

/** `x`, `y`, `z` per slot, in the shape `readPositions` writes and this reads. */
function newPositions(...slots: readonly (readonly [number, number, number])[]): Float32Array {
  const positions = new Float32Array(slots.length * POSITION_STRIDE);

  for (const [slot, [x, y, z]] of slots.entries()) {
    positions.set([x, y, z], slot * POSITION_STRIDE);
  }

  return positions;
}

describe('plateProjection', () => {
  // `Math.fround` rather than `toBeCloseTo`: the scratch is a `Float32Array`, so the exact answer
  // is the single-precision one and a tolerance would be hiding that rather than allowing for it.
  it("puts a slot where the overview says, at the plate's own scale", () => {
    const plate = plateProjection(dust2, 0, 1);

    plate.read(newPositions([500, -1200, UPPER_Z]), 2);

    expect(plate.x(0)).toBe(Math.fround(radarX(dust2, 500) * 2));
    expect(plate.y(0)).toBe(Math.fround(radarY(dust2, -1200) * 2));
  });

  it('shows a player on another level through the floor rather than at full strength', () => {
    const plate = plateProjection(nuke, 0, 2);

    plate.read(newPositions([0, 0, UPPER_Z], [0, 0, LOWER_Z]), 1);

    expect(plate.alpha(0)).toBe(1);
    expect(plate.alpha(1)).toBe(OTHER_LEVEL_ALPHA);
  });

  it('gives every slot on a single-level map the same full strength', () => {
    const plate = plateProjection(dust2, 0, 2);

    plate.read(newPositions([0, 0, UPPER_Z], [0, 0, LOWER_Z]), 1);

    expect(plate.alpha(0)).toBe(1);
    expect(plate.alpha(1)).toBe(1);
  });

  it('overwrites its scratch each frame rather than growing one per frame', () => {
    const plate = plateProjection(dust2, 0, 1);

    plate.read(newPositions([500, -1200, UPPER_Z]), 1);
    const first = plate.x(0);

    plate.read(newPositions([-500, -1200, UPPER_Z]), 1);

    expect(plate.x(0)).not.toBe(first);
    expect(plate.x(0)).toBe(Math.fround(radarX(dust2, -500)));
  });
});
