import { describe, expect, it } from 'vitest';
import {
  duelWeapons,
  headToHead,
  openingReading,
  opponentDuels,
  playerDuels,
} from '../helpers/duel-reading';
import { matchDuels, openingDuels } from '../helpers/duels';
import {
  asPlayerSlot,
  asTick,
  type MatchEvents,
  type ParsedDemo,
  type Round,
  type Team,
} from '../schema';
import { newEvents, newTrack, withKill } from './helpers';

const ct = asPlayerSlot(0);
const terrorist = asPlayerSlot(1);

function newRound(number: number, startTick: number, sides: readonly [Team, Team]): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: ct, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[0] },
      { slot: terrorist, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[1] },
    ],
  };
}

function newDemo(events: MatchEvents): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track: newTrack({ frameCount: 2000 }),
    events: { ...events, rounds: [newRound(1, 100, ['CT', 'T']), newRound(2, 2000, ['T', 'CT'])] },
  };
}

let events = newEvents();
events = withKill(events, { tick: asTick(400), attacker: ct, victim: terrorist, weapon: 'ak47' });
events = withKill(events, { tick: asTick(500), attacker: terrorist, victim: ct, weapon: 'awp' });
events = withKill(events, { tick: asTick(2400), attacker: ct, victim: terrorist, weapon: 'ak47' });
events = withKill(events, { tick: asTick(2500), attacker: ct, victim: ct, weapon: 'hegrenade' });

const demo = newDemo(events);

describe('opponentDuels', () => {
  it('leaves out a kill whose two ends are on one side', () => {
    expect(matchDuels(demo)).toHaveLength(4);
    expect(opponentDuels(demo)).toHaveLength(3);
  });
});

describe('headToHead', () => {
  it('counts who killed whom, one direction at a time', () => {
    const grid = headToHead(opponentDuels(demo), 10);

    expect(grid.killed(ct, terrorist)).toBe(2);
    expect(grid.killed(terrorist, ct)).toBe(1);
    expect(grid.killed(ct, ct)).toBe(0);
  });
});

describe('playerDuels', () => {
  it('reads kills and deaths, and the side each kill was made on', () => {
    const reading = playerDuels(opponentDuels(demo), ct);

    expect(reading.kills).toBe(2);
    expect(reading.deaths).toBe(1);
    // Slot 0 held CT in the first half and T in the second.
    expect(reading.killsAsCt).toBe(1);
    expect(reading.killsAsT).toBe(1);
    expect(reading.killed).toEqual([{ value: terrorist, count: 2 }]);
    expect(reading.diedTo).toEqual([{ value: terrorist, count: 1 }]);
  });

  it('is empty for a player with no duels', () => {
    const reading = playerDuels(opponentDuels(demo), asPlayerSlot(5));

    expect(reading).toMatchObject({ kills: 0, deaths: 0, killed: [], diedTo: [] });
  });
});

describe('duelWeapons', () => {
  it('names weapons the way the rest of the product does, most used first', () => {
    expect(duelWeapons(opponentDuels(demo), demo.events.kills)).toEqual([
      { value: 'AK-47', count: 2 },
      { value: 'AWP', count: 1 },
    ]);
  });
});

describe('openingReading', () => {
  it('credits each opening to the team the opener belongs to', () => {
    const reading = openingReading(demo, openingDuels(demo));

    // Slot 0 opened both rounds, on opposite sides: it is one team's, whichever side it held.
    expect(reading.byTeam).toEqual({ ct: 2, t: 0 });
    expect(reading.openers).toEqual([{ value: ct, count: 2 }]);
    expect(reading.firstDeaths).toEqual([{ value: terrorist, count: 2 }]);
  });
});
