import { asTick } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { type RoundEntry, roundTacticId, visibleEntries } from '../helpers/round-tactics';
import { formatClock, windowFraction } from '../helpers/window-strip';

function entry(
  number: number,
  side: 'CT' | 'T',
  level: 'coordinated' | 'partial' | 'loose',
): RoundEntry {
  return {
    roundIndex: number - 1,
    number,
    side,
    buy: 'full',
    didWin: true,
    isPlanted: false,
    site: null,
    stepCount: 2,
    coordination: { level, signals: [] },
  };
}

const entries = [
  entry(1, 'T', 'loose'),
  entry(2, 'CT', 'coordinated'),
  entry(3, 'T', 'coordinated'),
];

describe('visibleEntries', () => {
  it('filters by the side held that round', () => {
    expect(visibleEntries(entries, 'T', 'round').map((each) => each.number)).toEqual([1, 3]);
    expect(visibleEntries(entries, 'all', 'round')).toHaveLength(3);
  });

  it('sorts by coordination, round order within a level', () => {
    expect(visibleEntries(entries, 'all', 'coordination').map((each) => each.number)).toEqual([
      2, 3, 1,
    ]);
  });
});

describe('roundTacticId', () => {
  const window = { startTick: asTick(100), endTick: asTick(900) };

  it('is the same for the same window and different for another', () => {
    expect(roundTacticId('k', 4, 't', window)).toBe(roundTacticId('k', 4, 't', window));
    expect(roundTacticId('k', 4, 't', window)).not.toBe(
      roundTacticId('k', 4, 't', { ...window, endTick: asTick(901) }),
    );
    expect(roundTacticId('k', 4, 't', window)).not.toBe(roundTacticId('k', 4, 'ct', window));
  });
});

describe('window strip', () => {
  const bounds = { startTick: asTick(1000), endTick: asTick(3000) };

  it('places a tick on the strip and clamps what lies outside', () => {
    expect(windowFraction(bounds, asTick(2000))).toBe(0.5);
    expect(windowFraction(bounds, asTick(0))).toBe(0);
    expect(windowFraction(bounds, asTick(9000))).toBe(1);
  });

  it('reads seconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75.4)).toBe('1:15');
  });
});
