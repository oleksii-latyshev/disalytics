import { asTick } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  ALL_ROUNDS,
  edgeRound,
  isFiltering,
  matchesFilter,
  type RoundEntry,
  type RoundFilter,
  roundTacticId,
  stepRound,
} from '../helpers/round-tactics';
import { formatClock, windowFraction } from '../helpers/window-strip';

function entry(number: number, side: 'CT' | 'T', didWin: boolean, isPlanted: boolean): RoundEntry {
  return {
    roundIndex: number - 1,
    number,
    side,
    buy: 'full',
    didWin,
    winner: didWin ? side : side === 'T' ? 'CT' : 'T',
    startsSegment: false,
    isPlanted,
    site: null,
    stepCount: 2,
    coordination: { level: 'loose', signals: [] },
  };
}

const entries = [
  entry(1, 'T', true, true),
  entry(2, 'CT', true, false),
  entry(3, 'T', false, false),
  entry(4, 'CT', false, true),
];

const numbers = (list: readonly (RoundEntry | undefined)[]) => list.map((each) => each?.number);

describe('matchesFilter', () => {
  it('matches everything by default', () => {
    expect(entries.every((each) => matchesFilter(each, ALL_ROUNDS))).toBe(true);
    expect(isFiltering(ALL_ROUNDS)).toBe(false);
  });

  it('narrows by the side held, the result and the plant', () => {
    const only = (filter: Partial<RoundFilter>) =>
      numbers(entries.filter((each) => matchesFilter(each, { ...ALL_ROUNDS, ...filter })));
    expect(only({ ct: false })).toEqual([1, 3]);
    expect(only({ lost: false })).toEqual([1, 2]);
    expect(only({ isPlantedOnly: true })).toEqual([1, 4]);
    expect(only({ t: false, isPlantedOnly: true })).toEqual([4]);
    expect(isFiltering({ ...ALL_ROUNDS, won: false })).toBe(true);
  });
});

describe('stepRound', () => {
  const planted = { ...ALL_ROUNDS, isPlantedOnly: true };

  it('walks past rounds that do not match', () => {
    expect(stepRound(entries, planted, 0, 1)?.number).toBe(4);
    expect(stepRound(entries, planted, 3, -1)?.number).toBe(1);
  });

  it('stops at the end of the strip', () => {
    expect(stepRound(entries, planted, 3, 1)).toBeUndefined();
    expect(stepRound(entries, planted, 0, -1)).toBeUndefined();
  });

  it('finds the first and last matching round', () => {
    expect(edgeRound(entries, { ...ALL_ROUNDS, t: false }, 'first')?.number).toBe(2);
    expect(edgeRound(entries, { ...ALL_ROUNDS, t: false }, 'last')?.number).toBe(4);
    expect(edgeRound(entries, { ...ALL_ROUNDS, t: false, ct: false }, 'first')).toBeUndefined();
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
