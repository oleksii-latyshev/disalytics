import { describe, expect, it } from 'vitest';
import { matchEnemyBlindTime } from '../helpers/enemy-blind-time';
import { asPlayerSlot, asTick, type MatchEvents, type ParsedDemo, type Round } from '../schema';
import { newEvents, newTrack, withBlind } from './helpers';

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

describe('matchEnemyBlindTime', () => {
  it('adds opponent blind time to the side the attacker held that round', () => {
    let events = withBlind(newEvents(), {
      tick: asTick(300),
      attacker: first,
      victim: enemy,
      durationSeconds: 2.5,
    });
    events = withBlind(events, {
      tick: asTick(2300),
      attacker: first,
      victim: enemy,
      durationSeconds: 1.25,
    });

    expect(matchEnemyBlindTime(newDemo(events, [firstHalf, secondHalf]))).toEqual({
      CT: 2.5,
      T: 1.25,
    });
  });

  it('ignores unattributed, self, teammate, unknown-side, and post-round blinds', () => {
    let events = withBlind(newEvents(), {
      tick: asTick(200),
      attacker: null,
      victim: enemy,
    });
    events = withBlind(events, {
      tick: asTick(300),
      attacker: first,
      victim: first,
    });
    events = withBlind(events, {
      tick: asTick(400),
      attacker: first,
      victim: mate,
    });
    events = withBlind(events, {
      tick: asTick(500),
      attacker: first,
      victim: asPlayerSlot(9),
    });
    events = withBlind(events, {
      tick: asTick(950),
      attacker: first,
      victim: enemy,
    });

    expect(matchEnemyBlindTime(newDemo(events))).toEqual({ CT: 0, T: 0 });
  });
});
