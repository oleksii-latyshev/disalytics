import { asPlayerSlot, type PlayerInfo } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { killMarkers, namesBySlot, positionOnSpine, roundBands } from '../helpers/spine';
import { newDemo, newKill, newRound } from './helpers';

function newPlayer(slot: number, name: string): PlayerInfo {
  return { slot: asPlayerSlot(slot), steamId: `7656119800000000${slot}`, name, team: 'CT' };
}

describe('positionOnSpine', () => {
  it('puts the first sample on the left edge', () => {
    expect(positionOnSpine(0, 1000, 500)).toBe(0);
  });

  it('puts the last sample on the right edge', () => {
    expect(positionOnSpine(1000, 1000, 500)).toBe(500);
  });

  it('places a position between two samples proportionally', () => {
    expect(positionOnSpine(250.5, 1000, 500)).toBeCloseTo(125.25);
  });

  it('clamps a position outside the track onto the strip', () => {
    expect(positionOnSpine(-40, 1000, 500)).toBe(0);
    expect(positionOnSpine(4000, 1000, 500)).toBe(500);
  });

  it('collapses to the left edge for a match with no length', () => {
    expect(positionOnSpine(12, 0, 500)).toBe(0);
  });
});

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

describe('killMarkers', () => {
  it('places one marker per kill at the sample the kill lands on', () => {
    const demo = newDemo(2001, {
      kills: [newKill(0), newKill(4000, { attacker: null, victim: asPlayerSlot(3) })],
    });

    expect(killMarkers(demo)).toEqual([
      { index: 0, frame: 0, fraction: 0, attacker: 0, victim: 1 },
      { index: 1, frame: 1000, fraction: 0.5, attacker: null, victim: 3 },
    ]);
  });

  it('clamps a kill past the last sample onto the strip', () => {
    const [marker] = killMarkers(newDemo(2001, { kills: [newKill(40000)] }));

    expect(marker?.fraction).toBe(1);
  });

  it('has nothing to place for a match with no kills', () => {
    expect(killMarkers(newDemo(2001))).toEqual([]);
  });

  it('has nothing to place against a track with no samples', () => {
    expect(killMarkers(newDemo(0, { kills: [newKill(0)] }))).toEqual([]);
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
