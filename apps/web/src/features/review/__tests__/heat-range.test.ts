import { HEAT_BINS } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  clockOf,
  isWholeRange,
  PLAY_LAST_STEP,
  phaseOfRange,
  pickBin,
  playRange,
  rangeOfPhase,
  WHOLE_RANGE,
  windowOfRange,
} from '../helpers/heat-range';

describe('heat range', () => {
  it('is the whole round to begin with, which narrows nothing', () => {
    expect(isWholeRange(WHOLE_RANGE)).toBe(true);
    expect(windowOfRange(WHOLE_RANGE)).toBeNull();
  });

  it('knows a phase when it is exactly one', () => {
    expect(phaseOfRange(rangeOfPhase('middle'))).toBe('middle');
    expect(phaseOfRange({ first: 4, last: 10, pending: null })).toBeNull();
    expect(windowOfRange(rangeOfPhase('middle'))).toEqual({ fromSeconds: 20, toSeconds: 60 });
  });

  it('takes two presses for a range, in either order', () => {
    const first = pickBin(WHOLE_RANGE, 9);
    expect(first).toEqual({ first: 9, last: 9, pending: 9 });
    expect(isWholeRange(first)).toBe(false);

    expect(pickBin(first, 4)).toEqual({ first: 4, last: 9, pending: null });
    expect(pickBin(first, 12)).toEqual({ first: 9, last: 12, pending: null });
  });

  it('plays ten-second windows five seconds apart, up to the end of the axis', () => {
    expect(windowOfRange(playRange(0))).toEqual({ fromSeconds: 0, toSeconds: 10 });
    expect(windowOfRange(playRange(1))).toEqual({ fromSeconds: 5, toSeconds: 15 });
    expect(playRange(PLAY_LAST_STEP).last).toBe(HEAT_BINS - 1);
  });

  it('reads seconds as a round clock', () => {
    expect(clockOf(0)).toBe('0:00');
    expect(clockOf(65)).toBe('1:05');
    expect(clockOf(150)).toBe('2:30');
  });
});
