import { describe, expect, it } from 'vitest';
import { matchScoreboard } from '../helpers/scoreboard';
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

const first = asPlayerSlot(0);
const second = asPlayerSlot(1);

function newPlayer(slot: number, name: string, team: Team): PlayerInfo {
  return { slot: asPlayerSlot(slot), name, steamId: `7656119${slot}`, team };
}

/** The same two slots, on opposite sides in each half — which is what a whole-match reading trips on. */
function newRound(number: number, startTick: number, sides: readonly [Team, Team]): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner: sides[0],
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: first, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[0] },
      { slot: second, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[1] },
    ],
  };
}

const firstHalf = newRound(1, 100, ['CT', 'T']);
const secondHalf = newRound(2, 2000, ['T', 'CT']);

function newDemo(events: MatchEvents, rounds: readonly Round[]): ParsedDemo {
  return {
    header: {
      map: 'de_dust2',
      tickRate: 64,
      // The end-of-match roster, which names the side each slot held *last* — the reading this
      // helper must not group by.
      players: [newPlayer(0, 'one', 'T'), newPlayer(1, 'two', 'CT')],
      weapons: [],
    },
    track: newTrack({ frameCount: 2000 }),
    events: { ...events, rounds },
  };
}

describe('matchScoreboard', () => {
  it('groups the players by the team they opened on, not by the roster they end on', () => {
    const [ct, t] = matchScoreboard(newDemo(newEvents(), [firstHalf, secondHalf]));

    expect(ct.team).toBe('ct');
    expect(ct.players.map((player) => player.slot)).toEqual([first]);
    expect(t.players.map((player) => player.slot)).toEqual([second]);
  });

  it('counts a kill, the assist beside it and the death under it', () => {
    const events = withKill(newEvents(), {
      tick: asTick(400),
      attacker: first,
      victim: second,
      assister: second,
      isHeadshot: true,
    });

    const [ct, t] = matchScoreboard(newDemo(events, [firstHalf]));

    expect(ct.players[0]).toMatchObject({ kills: 1, headshots: 1, deaths: 0 });
    expect(t.players[0]).toMatchObject({ kills: 0, assists: 1, deaths: 1 });
  });

  it('leaves out the post-round kills that follow most rounds', () => {
    const events = withKill(newEvents(), { tick: asTick(950), attacker: first, victim: second });

    expect(matchScoreboard(newDemo(events, [firstHalf]))[0].players[0]?.kills).toBe(0);
  });

  it('counts damage to an opponent and never to a teammate, side by side in one match', () => {
    // Round 1 has them on opposite sides; the second fixture puts them on the same one, where the
    // identical hit is friendly fire.
    const events = withDamage(
      withDamage(newEvents(), { tick: asTick(400), attacker: first, victim: second }),
      { tick: asTick(2400), attacker: first, victim: second, healthDamage: 40 },
    );

    const opponents = newDemo(events, [firstHalf, newRound(2, 2000, ['CT', 'T'])]);
    const teammates = newDemo(events, [firstHalf, newRound(2, 2000, ['CT', 'CT'])]);

    expect(matchScoreboard(opponents)[0].players[0]?.damage).toBe(40 + 27);
    expect(matchScoreboard(teammates)[0].players[0]?.damage).toBe(27);
  });

  it('counts the rounds a slot was recorded on a side for, which is what damage is divided by', () => {
    const [ct] = matchScoreboard(newDemo(newEvents(), [firstHalf, secondHalf]));

    expect(ct.players[0]?.rounds).toBe(2);
  });

  it('carries the score of the team it names', () => {
    // `firstHalf` is won by CT and `secondHalf` by T, and in the second half the opening CT team is
    // the one playing T — so the team that opened on CT won both.
    const [ct, t] = matchScoreboard(newDemo(newEvents(), [firstHalf, secondHalf]));

    expect([ct.score, t.score]).toEqual([2, 0]);
  });

  it('has two teams and no players for a match with no rounds', () => {
    const board = matchScoreboard(newDemo(newEvents(), []));

    expect(board.map((team) => team.players.length)).toEqual([0, 0]);
  });
});
