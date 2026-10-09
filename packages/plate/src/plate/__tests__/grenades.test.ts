import { asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { isTrajectoryDrawn } from '../helpers/grenades';

const thrower = asPlayerSlot(3);
const someoneElse = asPlayerSlot(7);

describe('isTrajectoryDrawn', () => {
  it('draws every grenade in flight by default', () => {
    expect(isTrajectoryDrawn('flight', thrower, null)).toBe(true);
    expect(isTrajectoryDrawn('flight', thrower, someoneElse)).toBe(true);
  });

  it('draws nothing at all when it is off', () => {
    expect(isTrajectoryDrawn('off', thrower, thrower)).toBe(false);
  });

  it('keeps only the selected player once it is narrowed to them', () => {
    expect(isTrajectoryDrawn('selected', thrower, thrower)).toBe(true);
    expect(isTrajectoryDrawn('selected', thrower, someoneElse)).toBe(false);
  });

  it('draws nothing narrowed to a selection nobody has made', () => {
    expect(isTrajectoryDrawn('selected', thrower, null)).toBe(false);
  });
});
