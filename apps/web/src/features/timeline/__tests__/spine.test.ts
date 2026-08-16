import { asPlayerSlot, type PlayerInfo } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { namesBySlot, roundBands } from '../helpers/spine';
import { newDemo, newRound } from './helpers';

function newPlayer(slot: number, name: string): PlayerInfo {
  return { slot: asPlayerSlot(slot), steamId: `7656119800000000${slot}`, name, team: 'CT' };
}

describe('roundBands', () => {
  it('spans each round from its start to its end, carrying the winner', () => {
    const demo = newDemo(2001, {
      rounds: [newRound(1, 0, 'CT'), newRound(2, 4000, 'T')],
    });

    expect(roundBands(demo)).toEqual([
      { round: 1, winner: 'CT', startFraction: 0, endFraction: 1600 / 2000 },
      { round: 2, winner: 'T', startFraction: 1000 / 2000, endFraction: 1 },
    ]);
  });

  it('clamps a round that ends after the last sample onto the strip', () => {
    const [band] = roundBands(newDemo(2001, { rounds: [newRound(1, 40000)] }));

    expect(band).toEqual({ round: 1, winner: 'CT', startFraction: 1, endFraction: 1 });
  });

  it('has nothing to place for a match with no rounds', () => {
    expect(roundBands(newDemo(2001))).toEqual([]);
  });

  it('has nothing to place against a track with no samples', () => {
    expect(roundBands(newDemo(0, { rounds: [newRound(1, 0)] }))).toEqual([]);
  });
});

describe('namesBySlot', () => {
  it('indexes a name by the slot its player occupies', () => {
    const names = namesBySlot([newPlayer(2, 'donk'), newPlayer(0, 's1mple')]);

    expect(names).toHaveLength(3);
    expect(names[0]).toBe('s1mple');
    expect(names[1]).toBeUndefined();
    expect(names[2]).toBe('donk');
  });

  it('has no names for an empty roster', () => {
    expect(namesBySlot([])).toEqual([]);
  });
});
