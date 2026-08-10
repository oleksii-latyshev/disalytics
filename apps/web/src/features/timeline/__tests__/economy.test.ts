import { asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { economySteps } from '../helpers/economy';
import { newBuy, newDemo, newRound } from './helpers';

describe('economySteps', () => {
  it('names the better-equipped side and how far ahead it is', () => {
    const demo = newDemo(2001, {
      rounds: [newRound(1, 0, 'CT', newBuy({ CT: [4000, 1000], T: [900, 100] }))],
    });

    expect(economySteps(demo)).toEqual([
      {
        round: 1,
        startFraction: 0,
        endFraction: 1600 / 2000,
        leader: 'CT',
        difference: 4000,
        share: 1,
      },
    ]);
  });

  it('reads a gap the other way as the T side leading', () => {
    const demo = newDemo(2001, {
      rounds: [newRound(1, 0, 'T', newBuy({ CT: [500], T: [3500] }))],
    });

    expect(economySteps(demo).at(0)?.leader).toBe('T');
    expect(economySteps(demo).at(0)?.difference).toBe(3000);
  });

  it('scales every round against the widest gap the match holds', () => {
    const demo = newDemo(2001, {
      rounds: [
        newRound(1, 0, 'CT', newBuy({ CT: [5000], T: [1000] })),
        newRound(2, 4000, 'T', newBuy({ CT: [1000], T: [2000] })),
      ],
    });

    expect(economySteps(demo).map((step) => step.share)).toEqual([1, 0.25]);
  });

  it('leaves a round both sides bought the same without a leader', () => {
    const demo = newDemo(2001, {
      rounds: [newRound(1, 0, 'CT', newBuy({ CT: [2500], T: [2500] }))],
    });

    expect(economySteps(demo).at(0)).toMatchObject({ leader: null, difference: 0, share: 0 });
  });

  // A slot with no sample at freeze-time end has no side either, and counting its equipment for
  // whichever side it ended the match on is the reading `PlayerInfo.team` would have given.
  it('leaves a slot that was on no side out of both totals', () => {
    const buy = [
      ...newBuy({ CT: [3000], T: [1000] }),
      {
        slot: asPlayerSlot(9),
        money: 0,
        equipmentValue: 9000,
        buyType: 'full-buy' as const,
        team: null,
      },
    ];

    expect(
      economySteps(newDemo(2001, { rounds: [newRound(1, 0, 'CT', buy)] })).at(0),
    ).toMatchObject({
      leader: 'CT',
      difference: 2000,
    });
  });

  it('has nothing to place for a match with no rounds', () => {
    expect(economySteps(newDemo(2001))).toEqual([]);
  });

  it('has nothing to place against a track with no samples', () => {
    expect(economySteps(newDemo(0, { rounds: [newRound(1, 0)] }))).toEqual([]);
  });
});
