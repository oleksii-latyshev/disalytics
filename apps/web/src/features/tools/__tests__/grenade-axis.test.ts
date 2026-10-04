import { GRENADE_REFERENCES } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  AXIS_MAX_SECONDS,
  AXIS_TICK_SECONDS,
  axisFraction,
  RING_MAX_UNITS,
  ringFraction,
  sortByDuration,
} from '../helpers/grenade-axis';

describe('axisFraction', () => {
  it('puts an instant grenade at the start', () => {
    expect(axisFraction(null)).toBe(0);
    expect(axisFraction(0)).toBe(0);
  });

  it('scales a duration against the 25 s axis', () => {
    expect(axisFraction(5)).toBeCloseTo(0.2);
    expect(axisFraction(AXIS_MAX_SECONDS)).toBe(1);
  });

  it('clamps past the end of the axis', () => {
    expect(axisFraction(40)).toBe(1);
  });

  it('keeps every reference grenade on the axis', () => {
    for (const g of GRENADE_REFERENCES) {
      const f = axisFraction(g.durationSeconds);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

describe('axis ticks', () => {
  it('run from 0 to the axis end', () => {
    expect(AXIS_TICK_SECONDS[0]).toBe(0);
    expect(AXIS_TICK_SECONDS.at(-1)).toBe(AXIS_MAX_SECONDS);
  });
});

describe('ringFraction', () => {
  it('is relative to the widest reach', () => {
    expect(ringFraction(RING_MAX_UNITS)).toBe(1);
    expect(ringFraction(175)).toBeCloseTo(0.5);
    expect(ringFraction(0)).toBe(0);
  });
});

describe('sortByDuration', () => {
  it('orders longest first with instant grenades last', () => {
    const sorted = sortByDuration(GRENADE_REFERENCES);
    expect(sorted.map((g) => g.id)).toEqual([
      'smoke',
      'decoy',
      'fire',
      'incendiary',
      'flash',
      'he',
    ]);
  });

  it('does not mutate its input', () => {
    const before = GRENADE_REFERENCES.map((g) => g.id);
    sortByDuration(GRENADE_REFERENCES);
    expect(GRENADE_REFERENCES.map((g) => g.id)).toEqual(before);
  });
});
