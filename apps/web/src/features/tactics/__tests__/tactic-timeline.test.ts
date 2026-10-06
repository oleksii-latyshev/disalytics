import { describe, expect, it } from 'vitest';
import type { EditorStep } from '../helpers/editor-tactic';
import {
  calledOnRounds,
  formatClock,
  stepSegments,
  throwMarkers,
} from '../helpers/tactic-timeline';

function step(id: string, offset: number, releaseTimes: readonly number[] = []): EditorStep {
  return {
    id,
    name: id,
    timeOffsetSeconds: offset,
    players: [],
    throws: releaseTimes.map((releaseTime, i) => ({
      id: `${id}-${i}`,
      throwerSlot: 0,
      kind: 'smoke',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      releaseTime,
    })),
  };
}

describe('stepSegments', () => {
  it('runs each step to the next one and the last to the end', () => {
    const segments = stepSegments([step('a', 0), step('b', 10), step('c', 20)], 40);
    expect(segments.map((s) => [s.startPercent, s.widthPercent])).toEqual([
      [0, 25],
      [25, 25],
      [50, 50],
    ]);
  });

  it('survives an empty timeline', () => {
    expect(stepSegments([step('a', 0)], 0)).toEqual([
      { index: 0, startPercent: 0, widthPercent: 100 },
    ]);
  });
});

describe('throwMarkers', () => {
  it('places a throw at its step offset plus its release time', () => {
    const [marker] = throwMarkers([step('a', 10, [5])], 30);
    expect(marker?.seconds).toBe(15);
    expect(marker?.percent).toBe(50);
  });
});

describe('formatClock', () => {
  it('reads minutes and seconds', () => {
    expect(formatClock(13.9)).toBe('0:13');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('calledOnRounds', () => {
  it('lists round types in the editor order', () => {
    expect(calledOnRounds(['full', 'force'])).toBe('force, full');
  });

  it('reads as any round when none is picked', () => {
    expect(calledOnRounds([])).toBeUndefined();
    expect(calledOnRounds(undefined)).toBeUndefined();
  });
});
