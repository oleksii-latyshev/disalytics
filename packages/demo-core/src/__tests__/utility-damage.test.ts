import { describe, expect, it } from 'vitest';
import { matchUtilityDamage } from '../helpers/utility-damage';
import { asPlayerSlot, asTick, type MatchEvents, type ParsedDemo, type Round } from '../schema';
import { newEvents, newTrack, withDamage } from './helpers';

const first = asPlayerSlot(0);
const enemy = asPlayerSlot(1);
const mate = asPlayerSlot(2);

function newRound(number: number, startTick: number, firstSide: 'CT' | 'T'): Round {
  const otherSide = firstSide === 'CT' ? 'T' : 'CT';
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: first, money: 0, equipmentValue: 0, buyType: 'full-buy', team: firstSide },
      { slot: enemy, money: 0, equipmentValue: 0, buyType: 'full-buy', team: otherSide },
      { slot: mate, money: 0, equipmentValue: 0, buyType: 'full-buy', team: firstSide },
    ],
  };
}

const firstHalf = newRound(1, 100, 'CT');
const secondHalf = newRound(2, 2000, 'T');

function newDemo(events: MatchEvents, rounds: readonly Round[] = [firstHalf]): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track: newTrack({ frameCount: 2000 }),
    events: { ...events, rounds },
  };
}

describe('matchUtilityDamage', () => {
  it('adds utility damage to the side the attacker held that round', () => {
    let events = withDamage(newEvents(), {
      tick: asTick(300),
      attacker: first,
      victim: enemy,
      weapon: 'hegrenade',
      healthDamage: 40,
    });
    events = withDamage(events, {
      tick: asTick(400),
      attacker: first,
      victim: enemy,
      weapon: 'inferno',
      healthDamage: 15,
    });
    events = withDamage(events, {
      tick: asTick(2300),
      attacker: first,
      victim: enemy,
      weapon: 'hegrenade',
      healthDamage: 25,
    });

    expect(matchUtilityDamage(newDemo(events, [firstHalf, secondHalf]))).toEqual({ CT: 55, T: 25 });
  });

  it('ignores world, self, teammate, weapon, and post-round damage', () => {
    let events = withDamage(newEvents(), {
      tick: asTick(200),
      attacker: null,
      victim: enemy,
      weapon: 'hegrenade',
    });
    events = withDamage(events, {
      tick: asTick(300),
      attacker: first,
      victim: first,
      weapon: 'inferno',
    });
    events = withDamage(events, {
      tick: asTick(400),
      attacker: first,
      victim: mate,
      weapon: 'hegrenade',
    });
    events = withDamage(events, {
      tick: asTick(500),
      attacker: first,
      victim: enemy,
      weapon: 'ak47',
    });
    events = withDamage(events, {
      tick: asTick(950),
      attacker: first,
      victim: enemy,
      weapon: 'hegrenade',
    });

    expect(matchUtilityDamage(newDemo(events))).toEqual({ CT: 0, T: 0 });
  });
});
