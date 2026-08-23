import { asPlayerSlot, type PlayerEconomy } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { matchKills } from '../helpers/kills';
import { newDemo, newKill, newRound } from './helpers';

/** Which slot sat on which side that round, which is all `matchKills` reads a round for. */
function buy(ctSlot: number, tSlot: number): readonly PlayerEconomy[] {
  return [
    { slot: asPlayerSlot(ctSlot), money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'CT' },
    { slot: asPlayerSlot(tSlot), money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'T' },
  ];
}

/** 64 ticks to 16 samples, so a frame is a tick over four and 2001 frames is 8000 ticks. */
const FRAME_COUNT = 2001;

describe('matchKills', () => {
  it('places each kill where it falls in the match', () => {
    const demo = newDemo(FRAME_COUNT, {
      rounds: [newRound(1, 0, 'CT', buy(0, 1))],
      kills: [newKill(2000), newKill(6000)],
    });

    expect(matchKills(demo).map((kill) => kill.fraction)).toEqual([0.25, 0.75]);
  });

  it('tints a kill by the side the player who died held', () => {
    const demo = newDemo(FRAME_COUNT, {
      rounds: [newRound(1, 0, 'CT', buy(0, 1))],
      kills: [newKill(2000), newKill(3000, { victim: asPlayerSlot(0) })],
    });

    expect(matchKills(demo).map((kill) => kill.side)).toEqual(['T', 'CT']);
  });

  it('reads the sides of the round the kill is in, not of the first round', () => {
    // The two rounds swap the slots' sides, which is what a halftime does to every slot at once.
    const demo = newDemo(FRAME_COUNT, {
      rounds: [newRound(1, 0, 'CT', buy(0, 1)), newRound(2, 7000, 'CT', buy(1, 0))],
      kills: [newKill(2000), newKill(7500)],
    });

    expect(matchKills(demo).map((kill) => kill.side)).toEqual(['T', 'CT']);
  });

  it('keeps a kill no round covers and gives it no side', () => {
    // `newRound` closes round one at tick 6400; a kill after that is the post-round kill §7.3
    // refuses to count towards a survivor, and it is still a kill that happened.
    const demo = newDemo(FRAME_COUNT, {
      rounds: [newRound(1, 0, 'CT', buy(0, 1))],
      kills: [newKill(7000)],
    });
    const kills = matchKills(demo);

    expect(kills.map((kill) => kill.side)).toEqual([undefined]);
    expect(kills.at(0)?.fraction).toBeCloseTo(0.875);
  });

  it('has nothing to place in a demo with no samples', () => {
    expect(matchKills(newDemo(0, { kills: [newKill(2000)] }))).toEqual([]);
  });
});
