import { describe, expect, it } from 'vitest';
import { matchSegments } from '../helpers/segments';
import {
  asPlayerSlot,
  asTick,
  type ParsedDemo,
  type PlayerEconomy,
  type PlayerSlot,
  type Round,
  type Team,
} from '../schema';
import { newEvents, newTrack } from './helpers';

const slots: readonly PlayerSlot[] = [0, 1, 2, 3].map(asPlayerSlot);

/** Five would be a real side; four is enough to make a majority say something. */
function economy(sides: readonly (Team | null)[]): readonly PlayerEconomy[] {
  return sides.map((team, index) => ({
    slot: slots[index] ?? asPlayerSlot(index),
    money: 800,
    equipmentValue: 0,
    buyType: 'full-buy' as const,
    team,
  }));
}

function newRound(number: number, sides: readonly (Team | null)[]): Round {
  const start = number * 1000;

  return {
    number,
    startTick: asTick(start),
    freezeTimeEndTick: asTick(start + 100),
    endTick: asTick(start + 900),
    winner: 'CT',
    reason: 'all-t-eliminated',
    economy: economy(sides),
  };
}

function newDemo(rounds: readonly Round[]): ParsedDemo {
  return {
    header: { map: 'de_nuke', tickRate: 64, players: [], weapons: [] },
    track: newTrack(),
    events: { ...newEvents(), rounds },
  };
}

const FIRST_HALF: readonly Team[] = ['CT', 'CT', 'T', 'T'];
const SECOND_HALF: readonly Team[] = ['T', 'T', 'CT', 'CT'];

function half(from: number, count: number, sides: readonly Team[]): readonly Round[] {
  return Array.from({ length: count }, (_, index) => newRound(from + index, sides));
}

describe('matchSegments', () => {
  it('is empty for a demo with no rounds', () => {
    expect(matchSegments(newDemo([]))).toEqual([]);
  });

  it('is one segment for a match that never swaps sides', () => {
    // A 13-0 half, or any match called before halftime. One segment is the honest answer: there is
    // no divider to draw because nothing divided.
    expect(matchSegments(newDemo(half(1, 13, FIRST_HALF)))).toEqual([
      { startIndex: 0, endIndex: 12 },
    ]);
  });

  it('splits an MR12 match at the halftime, without being told what MR12 is', () => {
    const rounds = [...half(1, 12, FIRST_HALF), ...half(13, 12, SECOND_HALF)];

    expect(matchSegments(newDemo(rounds))).toEqual([
      { startIndex: 0, endIndex: 11 },
      { startIndex: 12, endIndex: 23 },
    ]);
  });

  it('splits an MR15 match by the same rule and at a different round', () => {
    const rounds = [...half(1, 15, FIRST_HALF), ...half(16, 15, SECOND_HALF)];

    expect(matchSegments(newDemo(rounds))).toEqual([
      { startIndex: 0, endIndex: 14 },
      { startIndex: 15, endIndex: 29 },
    ]);
  });

  it('splits every half of two overtimes as well as the regulation halves', () => {
    const rounds = [
      ...half(1, 12, FIRST_HALF),
      ...half(13, 12, SECOND_HALF),
      ...half(25, 3, FIRST_HALF),
      ...half(28, 3, SECOND_HALF),
      ...half(31, 3, FIRST_HALF),
      ...half(34, 3, SECOND_HALF),
    ];

    expect(matchSegments(newDemo(rounds))).toEqual([
      { startIndex: 0, endIndex: 11 },
      { startIndex: 12, endIndex: 23 },
      { startIndex: 24, endIndex: 26 },
      { startIndex: 27, endIndex: 29 },
      { startIndex: 30, endIndex: 32 },
      { startIndex: 33, endIndex: 35 },
    ]);
  });

  it('does not read a round with no economy as a boundary', () => {
    const rounds = [
      ...half(1, 3, FIRST_HALF),
      newRound(4, []),
      ...half(5, 3, FIRST_HALF),
      ...half(8, 3, SECOND_HALF),
    ];

    expect(matchSegments(newDemo(rounds))).toEqual([
      { startIndex: 0, endIndex: 6 },
      { startIndex: 7, endIndex: 9 },
    ]);
  });

  it('does not read one player changing side as a halftime', () => {
    // A substitution, a reconnect, or a slot the round recorded no side for. One of four is not a
    // majority, and a rule that keyed on any single slot would put a divider here.
    const swapped: readonly Team[] = ['T', 'CT', 'T', 'T'];
    const rounds = [...half(1, 3, FIRST_HALF), ...half(4, 3, swapped)];

    expect(matchSegments(newDemo(rounds))).toEqual([{ startIndex: 0, endIndex: 5 }]);
  });

  it('compares only the slots both rounds recorded a side for', () => {
    // Two players drop out at the halftime. The two that remain both crossed, so the half ended —
    // and counting the missing pair as unchanged would have hidden it behind a 2-of-4 tie.
    const partial: readonly (Team | null)[] = ['T', 'T', null, null];
    const rounds = [...half(1, 3, FIRST_HALF), newRound(4, partial), newRound(5, partial)];

    expect(matchSegments(newDemo(rounds))).toEqual([
      { startIndex: 0, endIndex: 2 },
      { startIndex: 3, endIndex: 4 },
    ]);
  });
});
