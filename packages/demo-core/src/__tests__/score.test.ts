import { describe, expect, it } from 'vitest';
import { matchScore, sideScoreAtFrame } from '../helpers/score';
import {
  asPlayerSlot,
  asTick,
  type ParsedDemo,
  type PlayerEconomy,
  type Round,
  type Team,
} from '../schema';
import { newEvents, newTrack } from './helpers';

const header = { map: 'de_mirage', tickRate: 64, players: [], weapons: [] };

/** Slots 0–4 on one side, 5–9 on the other, which is the shape a real freeze-time read has. */
function economy(ctSlots: readonly number[], tSlots: readonly number[]): readonly PlayerEconomy[] {
  const entry = (slot: number, team: Team | null): PlayerEconomy => ({
    slot: asPlayerSlot(slot),
    money: 0,
    equipmentValue: 0,
    buyType: 'full-buy',
    team,
  });

  return [...ctSlots.map((slot) => entry(slot, 'CT')), ...tSlots.map((slot) => entry(slot, 'T'))];
}

interface RoundSpec {
  winner: Team;
  ctSlots?: readonly number[];
  tSlots?: readonly number[];
}

const FIRST_HALF = { ctSlots: [0, 1, 2, 3, 4], tSlots: [5, 6, 7, 8, 9] };
const SECOND_HALF = { ctSlots: [5, 6, 7, 8, 9], tSlots: [0, 1, 2, 3, 4] };

function newDemo(specs: readonly RoundSpec[]): ParsedDemo {
  const rounds: Round[] = specs.map((spec, index) => ({
    number: index + 1,
    startTick: asTick(index * 1000),
    freezeTimeEndTick: asTick(index * 1000 + 100),
    endTick: asTick(index * 1000 + 900),
    winner: spec.winner,
    reason: spec.winner === 'CT' ? 'all-t-eliminated' : 'all-ct-eliminated',
    economy: economy(spec.ctSlots ?? [], spec.tSlots ?? []),
  }));

  return { header, track: newTrack(), events: { ...newEvents(), rounds } };
}

function half(count: number, winner: Team, sides: typeof FIRST_HALF): RoundSpec[] {
  return Array.from({ length: count }, () => ({ winner, ...sides }));
}

describe('matchScore', () => {
  it('is zero to zero for a demo with no rounds', () => {
    expect(matchScore(newDemo([]))).toEqual({ startedCt: 0, startedT: 0 });
  });

  it('counts by side while nobody has swapped', () => {
    const demo = newDemo([...half(3, 'CT', FIRST_HALF), ...half(2, 'T', FIRST_HALF)]);

    expect(matchScore(demo)).toEqual({ startedCt: 3, startedT: 2 });
  });

  it('follows a team across the halftime swap rather than counting sides', () => {
    // The opening CT team wins 3 as CT and 4 as T: 7, not the 3 a side count would report.
    const demo = newDemo([...half(3, 'CT', FIRST_HALF), ...half(4, 'CT', SECOND_HALF)]);

    expect(matchScore(demo)).toEqual({ startedCt: 3, startedT: 4 });
  });

  it('keeps the total equal to the rounds played', () => {
    const demo = newDemo([...half(8, 'CT', FIRST_HALF), ...half(5, 'T', SECOND_HALF)]);
    const score = matchScore(demo);

    expect(score.startedCt + score.startedT).toBe(13);
    expect(score).toEqual({ startedCt: 8 + 5, startedT: 0 });
  });

  it('decides a half by majority when a slot joined after the opening round', () => {
    const demo = newDemo([
      ...half(1, 'CT', FIRST_HALF),
      // Slot 4 left and slot 10 took the seat; the other four still name the side.
      { winner: 'CT', ctSlots: [0, 1, 2, 3, 10], tSlots: [5, 6, 7, 8, 9] },
    ]);

    expect(matchScore(demo)).toEqual({ startedCt: 2, startedT: 0 });
  });

  it('carries the previous round forward when a round records no sides at all', () => {
    const demo = newDemo([
      ...half(1, 'CT', FIRST_HALF),
      ...half(1, 'CT', SECOND_HALF),
      { winner: 'T' },
    ]);

    // The third round is read on the second's mapping, where T is the opening CT team.
    expect(matchScore(demo)).toEqual({ startedCt: 2, startedT: 1 });
  });

  it('stops at the round it is bounded to, which is the score after that round', () => {
    const demo = newDemo([...half(3, 'CT', FIRST_HALF), ...half(2, 'T', FIRST_HALF)]);

    expect(matchScore(demo, 0)).toEqual({ startedCt: 1, startedT: 0 });
    expect(matchScore(demo, 3)).toEqual({ startedCt: 3, startedT: 1 });
    expect(matchScore(demo, 99)).toEqual(matchScore(demo));
  });

  it('carries the halftime swap into a bounded score rather than counting sides', () => {
    const demo = newDemo([...half(3, 'CT', FIRST_HALF), ...half(4, 'CT', SECOND_HALF)]);

    expect(matchScore(demo, 4)).toEqual({ startedCt: 3, startedT: 2 });
  });

  it('degrades to a side count when no round records a side', () => {
    const demo = newDemo([{ winner: 'CT' }, { winner: 'CT' }, { winner: 'T' }]);

    expect(matchScore(demo)).toEqual({ startedCt: 2, startedT: 1 });
  });
});

// A round is 1000 ticks apart and ends 900 into itself; at 64 ticks against 16 samples a frame is
// four ticks, so round N runs from frame 250N to frame 250N + 225.
describe('sideScoreAtFrame', () => {
  it('starts the match at nil all', () => {
    expect(sideScoreAtFrame(newDemo(half(3, 'CT', FIRST_HALF)), 0)).toEqual({ CT: 0, T: 0 });
  });

  it('leaves a round still being played out of the score', () => {
    expect(sideScoreAtFrame(newDemo(half(3, 'CT', FIRST_HALF)), 224)).toEqual({ CT: 0, T: 0 });
  });

  it('counts a round on the sample its last tick falls on', () => {
    expect(sideScoreAtFrame(newDemo(half(3, 'CT', FIRST_HALF)), 225)).toEqual({ CT: 1, T: 0 });
  });

  it('holds the finished round on the board through the post-round', () => {
    expect(sideScoreAtFrame(newDemo(half(3, 'CT', FIRST_HALF)), 240)).toEqual({ CT: 1, T: 0 });
  });

  it('reports each team under the side it is now holding, not the side that won the round', () => {
    // The opening CT team takes 3 as CT; the other team then takes 4 as CT after the swap. A side
    // count reads that as 7 : 0, which is nobody's score — the teams are 3 and 4.
    const demo = newDemo([...half(3, 'CT', FIRST_HALF), ...half(4, 'CT', SECOND_HALF)]);

    expect(matchScore(demo)).toEqual({ startedCt: 3, startedT: 4 });
    expect(sideScoreAtFrame(demo, 1725)).toEqual({ CT: 4, T: 3 });
  });

  it('swaps the pair over at halftime without a round being played', () => {
    const demo = newDemo([...half(3, 'CT', FIRST_HALF), ...half(4, 'CT', SECOND_HALF)]);

    // The last frame of the first half, and the first frame of the round after the swap: the same
    // three rounds are on the board and they have changed sides.
    expect(sideScoreAtFrame(demo, 749)).toEqual({ CT: 3, T: 0 });
    expect(sideScoreAtFrame(demo, 750)).toEqual({ CT: 0, T: 3 });
  });

  it('scores a match with no rounds nil all', () => {
    expect(sideScoreAtFrame(newDemo([]), 4)).toEqual({ CT: 0, T: 0 });
  });
});
