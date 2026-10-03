import { describe, expect, it } from 'vitest';
import { matchPlayerStats, RATING_1_0, rating1 } from '../helpers/player-stats';
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
import { newEvents, newTrack, withBlind, withDamage, withKill } from './helpers';

const ct = asPlayerSlot(0);
const terrorist = asPlayerSlot(1);
const ctMate = asPlayerSlot(2);
const terroristMate = asPlayerSlot(3);
const SLOTS = [ct, terrorist, ctMate, terroristMate];

function newPlayer(slot: number, team: Team): PlayerInfo {
  return { slot: asPlayerSlot(slot), name: `p${slot}`, steamId: `7656119${slot}`, team };
}

function newRound(number: number, startTick: number, winner: Team = 'CT'): Round {
  const sides: readonly Team[] = ['CT', 'T', 'CT', 'T'];
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

function newDemo(events: MatchEvents, rounds: readonly Round[]): ParsedDemo {
  return {
    header: {
      map: 'de_dust2',
      tickRate: 64,
      players: [newPlayer(0, 'CT'), newPlayer(1, 'T'), newPlayer(2, 'CT'), newPlayer(3, 'T')],
      weapons: [],
    },
    track: newTrack({ frameCount: 4000 }),
    events: { ...events, rounds },
  };
}

function statsOf(demo: ParsedDemo, slot: number) {
  const [ctTeam, tTeam] = matchPlayerStats(demo);
  const row = [...ctTeam.players, ...tTeam.players].find((player) => player.slot === slot);
  if (row === undefined) throw new Error(`no row for ${slot}`);
  return row;
}

const round1 = newRound(1, 100);
const round2 = newRound(2, 1100);

describe('matchPlayerStats', () => {
  it('states K, A, D and ADR exactly as the scoreboard does', () => {
    let events = withKill(newEvents(), {
      tick: asTick(300),
      attacker: ct,
      victim: terrorist,
      assister: ctMate,
      isHeadshot: true,
    });
    events = withKill(events, { tick: asTick(400), attacker: terrorist, victim: ctMate });
    events = withDamage(events, {
      tick: asTick(300),
      attacker: ct,
      victim: terrorist,
      healthDamage: 100,
    });
    events = withDamage(events, {
      tick: asTick(1200),
      attacker: ct,
      victim: terrorist,
      healthDamage: 45,
    });
    const demo = newDemo(events, [round1, round2]);

    const board = matchScoreboard(demo);
    const stats = matchPlayerStats(demo);

    for (const [index, team] of stats.entries()) {
      expect(team.team).toBe(board[index]?.team);
      expect(team.score).toBe(board[index]?.score);
      for (const [row, totals] of team.players.entries()) {
        const expected = board[index]?.players[row];
        expect(totals.slot).toBe(expected?.slot);
        expect(totals.kills).toBe(expected?.kills);
        expect(totals.assists).toBe(expected?.assists);
        expect(totals.deaths).toBe(expected?.deaths);
        expect(totals.rounds).toBe(expected?.rounds);
        expect(totals.adr).toBeCloseTo((expected?.damage ?? 0) / (expected?.rounds ?? 1));
        expect(totals.headshotPercent).toBeCloseTo(
          expected?.kills ? (expected.headshots / expected.kills) * 100 : 0,
        );
      }
    }
    expect(statsOf(demo, ct).adr).toBeCloseTo(72.5);
    expect(statsOf(demo, ct).headshotPercent).toBe(100);
  });

  it('counts opening duels won and lost by the first opponent kill of each round', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: ct, victim: terrorist });
    events = withKill(events, { tick: asTick(350), attacker: terroristMate, victim: ctMate });
    events = withKill(events, { tick: asTick(1300), attacker: terrorist, victim: ct });
    const demo = newDemo(events, [round1, round2]);

    expect(statsOf(demo, ct)).toMatchObject({ openingWon: 1, openingLost: 1 });
    expect(statsOf(demo, terrorist)).toMatchObject({ openingWon: 1, openingLost: 1 });
    expect(statsOf(demo, ctMate)).toMatchObject({ openingWon: 0, openingLost: 0 });
  });

  it('counts a trade kill for the avenger and a traded death for the one avenged', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: terrorist, victim: ct });
    events = withKill(events, { tick: asTick(400), attacker: ctMate, victim: terrorist });
    const demo = newDemo(events, [round1]);

    expect(statsOf(demo, ctMate)).toMatchObject({ tradeKills: 1, deathsTraded: 0 });
    expect(statsOf(demo, ct)).toMatchObject({ tradeKills: 0, deathsTraded: 1 });
    expect(statsOf(demo, terrorist).deathsTraded).toBe(0);
  });

  it('buckets rounds by their exact opponent kill count and ignores teamkills', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: ct, victim: terrorist });
    events = withKill(events, { tick: asTick(320), attacker: ct, victim: terroristMate });
    events = withKill(events, { tick: asTick(340), attacker: ct, victim: ctMate });
    events = withKill(events, { tick: asTick(1300), attacker: ct, victim: terrorist });
    const demo = newDemo(events, [round1, round2]);

    expect(statsOf(demo, ct).multiKillRounds).toEqual([1, 0, 0, 0]);
    expect(statsOf(demo, ct).kills).toBe(4);
  });

  it('counts a clutch won by the last player alive', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: terrorist, victim: ctMate });
    events = withKill(events, { tick: asTick(400), attacker: ct, victim: terrorist });
    events = withKill(events, { tick: asTick(500), attacker: ct, victim: terroristMate });
    const demo = newDemo(events, [round1]);

    expect(statsOf(demo, ct).clutchesWon).toBe(1);
    expect(statsOf(demo, ctMate).clutchesWon).toBe(0);
  });

  it('attributes utility damage and enemy blind time to the thrower', () => {
    let events = withDamage(newEvents(), {
      tick: asTick(300),
      attacker: ct,
      victim: terrorist,
      weapon: 'hegrenade',
      healthDamage: 40,
    });
    events = withDamage(events, {
      tick: asTick(310),
      attacker: ct,
      victim: terrorist,
      weapon: 'ak47',
      healthDamage: 27,
    });
    events = withDamage(events, {
      tick: asTick(320),
      attacker: ct,
      victim: ctMate,
      weapon: 'hegrenade',
      healthDamage: 10,
    });
    events = withBlind(events, {
      tick: asTick(330),
      attacker: ct,
      victim: terrorist,
      durationSeconds: 2.5,
    });
    events = withBlind(events, {
      tick: asTick(340),
      attacker: ct,
      victim: ctMate,
      durationSeconds: 3,
      isTeammate: true,
    });
    const demo = newDemo(events, [round1]);

    expect(statsOf(demo, ct)).toMatchObject({ utilityDamage: 40, enemyBlindSeconds: 2.5 });
    expect(statsOf(demo, ctMate)).toMatchObject({ utilityDamage: 0, enemyBlindSeconds: 0 });
  });

  describe('flash assists', () => {
    const killAt = (tick: number, attacker = ctMate) =>
      withKill(newEvents(), { tick: asTick(tick), attacker, victim: terrorist });

    it('credits a teammate who had the victim blinded when the kill landed', () => {
      const events = withBlind(killAt(400), {
        tick: asTick(350),
        attacker: ct,
        victim: terrorist,
        durationSeconds: 2,
      });

      expect(statsOf(newDemo(events, [round1]), ct).flashAssists).toBe(1);
    });

    it('does not credit an expired flash, a team flash, or the killer', () => {
      const expired = withBlind(killAt(400), {
        tick: asTick(200),
        attacker: ct,
        victim: terrorist,
        durationSeconds: 1,
      });
      expect(statsOf(newDemo(expired, [round1]), ct).flashAssists).toBe(0);

      const team = withBlind(killAt(400), {
        tick: asTick(350),
        attacker: ct,
        victim: terrorist,
        isTeammate: true,
      });
      expect(statsOf(newDemo(team, [round1]), ct).flashAssists).toBe(0);

      const own = withBlind(killAt(400, ct), {
        tick: asTick(350),
        attacker: ct,
        victim: terrorist,
      });
      expect(statsOf(newDemo(own, [round1]), ct).flashAssists).toBe(0);
    });

    it('does not credit a flash on somebody other than the victim, or a flash by an opponent', () => {
      const other = withBlind(killAt(400), {
        tick: asTick(350),
        attacker: ct,
        victim: terroristMate,
      });
      expect(statsOf(newDemo(other, [round1]), ct).flashAssists).toBe(0);

      const enemy = withBlind(killAt(400), {
        tick: asTick(350),
        attacker: terroristMate,
        victim: terrorist,
      });
      expect(statsOf(newDemo(enemy, [round1]), terroristMate).flashAssists).toBe(0);
    });

    it('credits one flasher once even when two of their flashes overlap', () => {
      let events = withBlind(killAt(400), { tick: asTick(340), attacker: ct, victim: terrorist });
      events = withBlind(events, { tick: asTick(360), attacker: ct, victim: terrorist });

      expect(statsOf(newDemo(events, [round1]), ct).flashAssists).toBe(1);
    });
  });

  describe('KAST', () => {
    it('counts rounds with a kill, an assist, a survival or a traded death', () => {
      // Round 1: ct kills (K). Round 2: ct dies untraded with no kill or assist.
      // Round 3: ct dies and is traded (T). Round 4: ct only survives (S).
      // Round 5: ct assists but dies (A).
      const rounds = [
        newRound(1, 100),
        newRound(2, 1100),
        newRound(3, 2100),
        newRound(4, 3100),
        newRound(5, 4100),
      ];
      let events = withKill(newEvents(), { tick: asTick(300), attacker: ct, victim: terrorist });
      events = withKill(events, { tick: asTick(1300), attacker: terrorist, victim: ct });
      events = withKill(events, { tick: asTick(2300), attacker: terrorist, victim: ct });
      events = withKill(events, { tick: asTick(2400), attacker: ctMate, victim: terrorist });
      events = withKill(events, {
        tick: asTick(4300),
        attacker: ctMate,
        victim: terroristMate,
        assister: ct,
      });
      events = withKill(events, { tick: asTick(4310), attacker: terrorist, victim: ct });
      const demo = { ...newDemo(events, rounds), track: newTrack({ frameCount: 6000 }) };

      expect(statsOf(demo, ct).kastPercent).toBeCloseTo((4 / 5) * 100);
    });

    it('counts a death by the world as a death', () => {
      const events = withKill(newEvents(), { tick: asTick(300), attacker: null, victim: ct });

      expect(statsOf(newDemo(events, [round1]), ct).kastPercent).toBe(0);
    });
  });

  it('computes Rating 1.0 from opponent kills, deaths and the kill-count rounds', () => {
    let events = withKill(newEvents(), { tick: asTick(300), attacker: ct, victim: terrorist });
    events = withKill(events, { tick: asTick(320), attacker: ct, victim: terroristMate });
    events = withKill(events, { tick: asTick(1300), attacker: terrorist, victim: ct });
    const demo = newDemo(events, [round1, round2]);

    const expected = rating1(2, 2, 1, [0, 1, 0, 0, 0]);
    expect(statsOf(demo, ct).rating).toBeCloseTo(expected);
    expect(expected).toBeCloseTo((2 / 2 / 0.679 + 0.7 * (1 / 2 / 0.317) + 4 / 2 / 1.277) / 2.7);
  });
});

describe('rating1', () => {
  it('rates an average player 1.00', () => {
    const rounds = 1000;
    const kills = RATING_1_0.averageKillsPerRound * rounds;
    const deaths = rounds - RATING_1_0.averageSurvivalPerRound * rounds;
    // 1.277 value per round, as one-kill rounds only: 1 per round per kill.
    const multi = RATING_1_0.averageMultiKillValuePerRound * rounds;

    expect(
      (kills / rounds / RATING_1_0.averageKillsPerRound +
        RATING_1_0.survivalWeight *
          ((rounds - deaths) / rounds / RATING_1_0.averageSurvivalPerRound) +
        multi / rounds / RATING_1_0.averageMultiKillValuePerRound) /
        RATING_1_0.divisor,
    ).toBeCloseTo(1);
  });

  it('is zero before any round was played', () => {
    expect(rating1(0, 0, 0, [0, 0, 0, 0, 0])).toBe(0);
  });
});
