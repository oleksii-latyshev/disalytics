import { describe, expect, it } from 'vitest';
import { matchSummary } from '../helpers/match-summary';
import { playerKeyRounds } from '../helpers/player-profile';
import {
  asPlayerSlot,
  asTick,
  type BuyType,
  type ParsedDemo,
  type PlayerEconomy,
  type Round,
  type RoundWinReason,
  type Team,
} from '../schema';
import { newEvents, newTrack, withKill } from './helpers';

const OPENING_CT = [0, 1, 2, 3, 4];
const OPENING_T = [5, 6, 7, 8, 9];

interface Spec {
  /** The side that wins; the opening CT team holds CT in rounds 1–12 and T in 13–24. */
  winner: Team;
  reason?: RoundWinReason;
  buys?: readonly [BuyType, BuyType];
  /** Kills by the winner's team: victims in order, all by `killer`. */
  killer?: number;
  victims?: readonly number[];
}

function sideOfOpeningCt(number: number): Team {
  return number <= 12 ? 'CT' : 'T';
}

function economy(number: number, buys: readonly [BuyType, BuyType]): readonly PlayerEconomy[] {
  const ctSide = sideOfOpeningCt(number);
  const entry = (slot: number, team: Team, buyType: BuyType): PlayerEconomy => ({
    slot: asPlayerSlot(slot),
    money: 0,
    equipmentValue: 0,
    buyType,
    team,
  });
  return [
    ...OPENING_CT.map((slot) => entry(slot, ctSide, buys[0])),
    ...OPENING_T.map((slot) => entry(slot, ctSide === 'CT' ? 'T' : 'CT', buys[1])),
  ];
}

function newDemo(specs: readonly Spec[]): ParsedDemo {
  let events = newEvents();
  const rounds: Round[] = specs.map((spec, index) => {
    const number = index + 1;
    const startTick = index * 1000;
    for (const [at, victim] of (spec.victims ?? []).entries()) {
      events = withKill(events, {
        tick: asTick(startTick + 200 + at * 10),
        attacker: asPlayerSlot(spec.killer ?? 0),
        victim: asPlayerSlot(victim),
      });
    }
    return {
      number,
      startTick: asTick(startTick),
      freezeTimeEndTick: asTick(startTick + 100),
      endTick: asTick(startTick + 900),
      winner: spec.winner,
      reason: spec.reason ?? (spec.winner === 'CT' ? 'all-t-eliminated' : 'all-ct-eliminated'),
      roundTimeSeconds: null,
      economy: economy(number, spec.buys ?? ['full-buy', 'eco']),
    };
  });

  return {
    header: { map: 'de_mirage', tickRate: 64, players: [], weapons: [] },
    track: newTrack(),
    events: { ...events, rounds },
  };
}

/** Every round won by the side CT, so the opening CT team takes 1–12 bar round 6 and loses 13–24. */
function regulation(): Spec[] {
  return Array.from({ length: 24 }, (_, index): Spec => ({ winner: index === 5 ? 'T' : 'CT' }));
}

describe('matchSummary', () => {
  it('attributes each round to the team, not the side, and keeps the side it held', () => {
    const { rounds } = matchSummary(newDemo(regulation()));

    expect(rounds[0]).toMatchObject({ number: 1, winner: 'ct', winnerSide: 'CT' });
    expect(rounds[5]).toMatchObject({ winner: 't', winnerSide: 'T' });
    expect(rounds[12]).toMatchObject({ number: 13, winner: 't', winnerSide: 'CT' });
  });

  it('counts the score in each half by team', () => {
    const { score, halves } = matchSummary(newDemo(regulation()));

    expect(halves.first).toEqual({ startedCt: 11, startedT: 1 });
    expect(halves.second).toEqual({ startedCt: 0, startedT: 12 });
    expect(halves.overtime).toBeNull();
    expect(score).toEqual({ startedCt: 11, startedT: 13 });
  });

  it('ends a half after round 12 and 24, and each overtime half after that', () => {
    const specs = Array.from({ length: 30 }, (): Spec => ({ winner: 'CT' }));
    const { rounds, halves } = matchSummary(newDemo(specs));
    const endings = rounds.filter((round) => round.endsHalf).map((round) => round.number);

    expect(endings).toEqual([12, 24, 27, 30]);
    expect(halves.overtime).not.toBeNull();
  });

  it('names what each team bought, started-CT team first', () => {
    const specs = regulation();
    specs[1] = { winner: 'CT', buys: ['force-buy', 'full-buy'] };
    const { rounds } = matchSummary(newDemo(specs));

    expect(rounds[0]?.buys).toEqual({ ct: 'pistol', t: 'pistol' });
    expect(rounds[1]?.buys).toEqual({ ct: 'force', t: 'full' });
    expect(rounds[13]?.buys).toEqual({ ct: 'full', t: 'eco' });
  });

  it('leaves a draw with no winner and no buy, and out of every half', () => {
    const specs = regulation();
    specs[2] = { winner: 'CT', reason: 'draw' };
    const { rounds, halves } = matchSummary(newDemo(specs));

    expect(rounds[2]).toMatchObject({ winner: null, winnerSide: null });
    expect(rounds[2]?.buys).toEqual({ ct: null, t: null });
    expect(halves.first.startedCt).toBe(10);
  });

  it('names the player with the most opponent kills, and the first to reach it on a tie', () => {
    const specs = regulation();
    specs[3] = { winner: 'CT', killer: 1, victims: [5, 6, 7] };
    const { rounds } = matchSummary(newDemo(specs));

    expect(rounds[3]?.topKiller).toEqual({ slot: 1, kills: 3 });
    expect(rounds[4]?.topKiller).toBeNull();
  });
});

describe('playerKeyRounds', () => {
  it('lists the three-kill rounds of one player, oldest round first', () => {
    const specs = regulation();
    specs[3] = { winner: 'CT', killer: 1, victims: [5, 6, 7] };
    specs[1] = { winner: 'CT', killer: 1, victims: [5, 6] };
    const demo = newDemo(specs);

    expect(playerKeyRounds(demo, 1)).toEqual([{ roundIndex: 3, kind: 'multi', count: 3 }]);
    expect(playerKeyRounds(demo, 2)).toEqual([]);
  });
});
