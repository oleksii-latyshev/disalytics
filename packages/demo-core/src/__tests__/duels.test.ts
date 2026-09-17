import { describe, expect, it } from 'vitest';
import { matchDuels, multiKills, openingDuels } from '../helpers/duels';
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
const ctTeammate = asPlayerSlot(2);
const terroristTeammate = asPlayerSlot(3);

/** The same two slots, on opposite sides in each half — which is what a whole-match reading trips on. */
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

const firstHalf = newRound(1, 100, ['CT', 'T']);
const secondHalf = newRound(2, 2000, ['T', 'CT']);

function newDemo(events: MatchEvents, rounds: readonly Round[]): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track: newTrack({ frameCount: 2000 }),
    events: { ...events, rounds },
  };
}

describe('matchDuels', () => {
  it('reads each kill against the sides that round recorded, not the end-of-match roster', () => {
    const events = withKill(
      withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: terrorist }),
      { tick: asTick(2400), attacker: ct, victim: terrorist },
    );

    const duels = matchDuels(newDemo(events, [firstHalf, secondHalf]));

    expect(duels.map((duel) => duel.attackerSide)).toEqual(['CT', 'T']);
    expect(duels.map((duel) => duel.victimSide)).toEqual(['T', 'CT']);
    expect(duels.map((duel) => duel.roundIndex)).toEqual([0, 1]);
    expect(duels.map((duel) => duel.killIndex)).toEqual([0, 1]);
  });

  it('reads the frame the kill happened on', () => {
    const events = withKill(newEvents(), { tick: asTick(448), attacker: ct, victim: terrorist });

    const [duel] = matchDuels(newDemo(events, [firstHalf]));

    // 448 ticks at 64 Hz is 7 s, which is frame 112 of a track sampled at 16 Hz.
    expect(duel?.frame).toBe(112);
  });

  it('leaves out a kill the world did, which has no end to draw from', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: null, victim: terrorist });

    expect(matchDuels(newDemo(events, [firstHalf]))).toEqual([]);
  });

  it('leaves out the post-round kills that follow most rounds', () => {
    const events = withKill(newEvents(), { tick: asTick(950), attacker: ct, victim: terrorist });

    expect(matchDuels(newDemo(events, [firstHalf]))).toEqual([]);
  });

  it('keeps a kill whose two ends are the same player', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: ct });

    expect(matchDuels(newDemo(events, [firstHalf]))).toHaveLength(1);
  });

  it('has nothing to say for a match with no rounds', () => {
    const events = withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: terrorist });

    expect(matchDuels(newDemo(events, []))).toEqual([]);
  });
});

describe('openingDuels', () => {
  it('keeps one opening per round with the side recorded in that round', () => {
    let events = withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: terrorist });
    events = withKill(events, { tick: asTick(500), attacker: terrorist, victim: ct });
    events = withKill(events, { tick: asTick(2400), attacker: ct, victim: terrorist });

    expect(
      openingDuels(newDemo(events, [firstHalf, secondHalf])).map((duel) => ({
        roundIndex: duel.roundIndex,
        attackerSide: duel.attackerSide,
      })),
    ).toEqual([
      { roundIndex: 0, attackerSide: 'CT' },
      { roundIndex: 1, attackerSide: 'T' },
    ]);
  });

  it('keeps the first opponent kill per round after ignoring non-duels', () => {
    const roundWithTeammate: Round = {
      ...firstHalf,
      economy: [
        ...firstHalf.economy,
        {
          slot: ctTeammate,
          money: 0,
          equipmentValue: 0,
          buyType: 'full-buy',
          team: 'CT',
        },
      ],
    };
    let events = withKill(newEvents(), {
      tick: asTick(200),
      attacker: null,
      victim: terrorist,
    });
    events = withKill(events, { tick: asTick(300), attacker: ct, victim: ct });
    events = withKill(events, { tick: asTick(350), attacker: ct, victim: ctTeammate });
    events = withKill(events, { tick: asTick(400), attacker: terrorist, victim: ct });
    events = withKill(events, { tick: asTick(500), attacker: ct, victim: terrorist });

    expect(openingDuels(newDemo(events, [roundWithTeammate]))).toMatchObject([
      { roundIndex: 0, attacker: terrorist, victim: ct, attackerSide: 'T', victimSide: 'CT' },
    ]);
  });
});

describe('multiKills', () => {
  it('groups opponent kills by player and round using that round side', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: ct, victim: terrorist });
    events = withKill(events, {
      tick: asTick(400),
      attacker: ct,
      victim: terroristTeammate,
    });
    events = withKill(events, { tick: asTick(2300), attacker: ct, victim: terrorist });
    events = withKill(events, {
      tick: asTick(2400),
      attacker: ct,
      victim: terroristTeammate,
    });
    const rounds = [firstHalf, secondHalf].map((round) => ({
      ...round,
      economy: [
        ...round.economy,
        {
          slot: terroristTeammate,
          money: 0,
          equipmentValue: 0,
          buyType: 'full-buy' as const,
          team: round === firstHalf ? ('T' as const) : ('CT' as const),
        },
      ],
    }));

    expect(multiKills(newDemo(events, rounds))).toEqual([
      { roundIndex: 0, player: ct, side: 'CT', kills: 2 },
      { roundIndex: 1, player: ct, side: 'T', kills: 2 },
    ]);
  });

  it('ignores world, suicide, team, single, and post-round kills', () => {
    const round: Round = {
      ...firstHalf,
      economy: [
        ...firstHalf.economy,
        {
          slot: ctTeammate,
          money: 0,
          equipmentValue: 0,
          buyType: 'full-buy',
          team: 'CT',
        },
      ],
    };
    let events = withKill(newEvents(), { tick: asTick(200), attacker: null, victim: terrorist });
    events = withKill(events, { tick: asTick(300), attacker: ct, victim: ct });
    events = withKill(events, { tick: asTick(400), attacker: ct, victim: ctTeammate });
    events = withKill(events, { tick: asTick(500), attacker: ct, victim: terrorist });
    events = withKill(events, { tick: asTick(950), attacker: ct, victim: terrorist });

    expect(multiKills(newDemo(events, [round]))).toEqual([]);
  });
});
