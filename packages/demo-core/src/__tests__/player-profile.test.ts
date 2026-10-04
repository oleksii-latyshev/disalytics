import { describe, expect, it } from 'vitest';
import { foldPlayerLines, playerMatchLine } from '../helpers/player-profile';
import {
  asPlayerSlot,
  asTick,
  type MatchEvents,
  type ParsedDemo,
  type PlayerInfo,
  type Round,
  type Team,
} from '../schema';
import { newEvents, newTrack, withDamage, withKill } from './helpers';

const ct = asPlayerSlot(0);
const terrorist = asPlayerSlot(1);
const ctMate = asPlayerSlot(2);
const terroristMate = asPlayerSlot(3);
const SLOTS = [ct, terrorist, ctMate, terroristMate];

function newPlayer(slot: number, team: Team): PlayerInfo {
  return { slot: asPlayerSlot(slot), name: `p${slot}`, steamId: `7656119${slot}`, team };
}

function newRound(number: number, startTick: number, winner: Team, swapped = false): Round {
  const sides: readonly Team[] = swapped ? ['T', 'CT', 'T', 'CT'] : ['CT', 'T', 'CT', 'T'];
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner,
    reason: winner === 'CT' ? 'all-t-eliminated' : 'all-ct-eliminated',
    roundTimeSeconds: null,
    economy: SLOTS.map((slot, index) => ({
      slot,
      money: 0,
      equipmentValue: 0,
      buyType: 'full-buy' as const,
      team: sides[index] ?? null,
    })),
  };
}

function newDemo(events: MatchEvents, rounds: readonly Round[], map = 'de_dust2'): ParsedDemo {
  return {
    header: {
      map,
      tickRate: 64,
      players: [newPlayer(0, 'CT'), newPlayer(1, 'T'), newPlayer(2, 'CT'), newPlayer(3, 'T')],
      weapons: [],
    },
    track: newTrack({ frameCount: 4000 }),
    events: { ...events, rounds },
  };
}

// Round 1: CT wins, `ct` kills three. Round 2 (sides swapped): CT wins, so slot 0's team loses.
const rounds = [newRound(1, 100, 'CT'), newRound(2, 1100, 'CT', true)];

function threeKillDemo(): ParsedDemo {
  let events = withKill(newEvents(), {
    tick: asTick(300),
    attacker: ct,
    victim: terrorist,
    isHeadshot: true,
    weapon: 'ak47',
  });
  events = withKill(events, {
    tick: asTick(320),
    attacker: ct,
    victim: terroristMate,
    weapon: 'glock',
  });
  events = withKill(events, { tick: asTick(340), attacker: ct, victim: terrorist, weapon: 'ak47' });
  events = withKill(events, { tick: asTick(1300), attacker: terrorist, victim: ct });
  events = withDamage(events, {
    tick: asTick(300),
    attacker: ct,
    victim: terrorist,
    healthDamage: 100,
  });
  return newDemo(events, rounds);
}

describe('playerMatchLine', () => {
  it('is null when nobody in the match has the id', () => {
    expect(playerMatchLine(threeKillDemo(), '1')).toBeNull();
  });

  it('states the match from the player’s side, with the sides they held each round', () => {
    const line = playerMatchLine(threeKillDemo(), '76561190');
    if (line === null) throw new Error('no line');

    expect(line).toMatchObject({
      name: 'p0',
      map: 'de_dust2',
      openedAs: 'ct',
      rounds: 2,
      kills: 3,
      deaths: 1,
      headshots: 1,
      damage: 100,
    });
    // Round 1 won on CT, round 2 lost on T, so the opening-CT team has one round of two.
    expect(line.ownScore).toBe(1);
    expect(line.opponentScore).toBe(1);
    expect(line.result).toBe('draw');
    expect(line.sides.CT).toEqual({ kills: 3, deaths: 0, rounds: 1, roundsWon: 1 });
    expect(line.sides.T).toEqual({ kills: 0, deaths: 1, rounds: 1, roundsWon: 0 });
    expect(line.multiKills).toEqual([{ roundIndex: 0, kind: 'multi', count: 3 }]);
    expect(line.multiKillRounds).toEqual([0, 1, 0, 0]);
  });

  it('counts kills by weapon, biggest first', () => {
    const line = playerMatchLine(threeKillDemo(), '76561190');
    const [first, second] = line?.weapons ?? [];

    expect(first?.kills).toBe(2);
    expect(second?.kills).toBe(1);
  });
});

describe('foldPlayerLines', () => {
  it('weighs each match by its rounds and adds the sides and weapons', () => {
    const line = playerMatchLine(threeKillDemo(), '76561190');
    if (line === null) throw new Error('no line');
    const other = {
      ...line,
      rounds: 6,
      damage: 400,
      kills: 1,
      headshots: 0,
      result: 'win' as const,
    };

    const summary = foldPlayerLines([line, other]);

    expect(summary).toMatchObject({
      matches: 2,
      wins: 1,
      draws: 1,
      rounds: 8,
      kills: 4,
      damage: 500,
    });
    expect(summary.adr).toBeCloseTo(62.5);
    expect(summary.headshotPercent).toBeCloseTo(25);
    expect(summary.sides.CT.rounds).toBe(2);
    expect(summary.weapons.reduce((sum, entry) => sum + entry.kills, 0)).toBe(6);
  });

  it('is all zeros for no matches', () => {
    expect(foldPlayerLines([])).toMatchObject({ matches: 0, adr: 0, kd: 0, kastPercent: 0 });
  });
});
