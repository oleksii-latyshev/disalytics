import { describe, expect, it } from 'vitest';
import { matchPlayerStats } from '../helpers/player-stats';
import {
  averageEnemyBlind,
  enemiesPerFlash,
  matchUtilityStats,
  totalThrown,
} from '../helpers/utility-stats';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
  type MatchEvents,
  type ParsedDemo,
  type PlayerInfo,
  type Round,
  type Team,
} from '../schema';
import { atFrame, newEvents, newTrack, withBlind, withGrenade, withKill } from './helpers';

const ct = asPlayerSlot(0);
const terrorist = asPlayerSlot(1);
const ctMate = asPlayerSlot(2);
const terroristMate = asPlayerSlot(3);
const SLOTS = [ct, terrorist, ctMate, terroristMate];

function newPlayer(slot: number, team: Team): PlayerInfo {
  return { slot: asPlayerSlot(slot), name: `p${slot}`, steamId: `7656119${slot}`, team };
}

function newRound(number: number, startTick: number, sides: readonly Team[]): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 100),
    endTick: asTick(startTick + 800),
    winner: 'CT',
    reason: 'all-t-eliminated',
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

const round1 = newRound(1, 100, ['CT', 'T', 'CT', 'T']);
const round2 = newRound(2, 2000, ['T', 'CT', 'T', 'CT']);

function newDemo(
  events: MatchEvents,
  rounds: readonly Round[] = [round1],
  track = newTrack({ frameCount: 1500 }),
): ParsedDemo {
  return {
    header: {
      map: 'de_dust2',
      tickRate: 64,
      players: [newPlayer(0, 'CT'), newPlayer(1, 'T'), newPlayer(2, 'CT'), newPlayer(3, 'T')],
      weapons: [],
    },
    track,
    events: { ...events, rounds },
  };
}

function rowOf(demo: ParsedDemo, slot: number) {
  const [first, second] = matchUtilityStats(demo);
  const row = [...first.players, ...second.players].find((player) => player.slot === slot);
  if (row === undefined) throw new Error(`no row for slot ${slot}`);
  return row;
}

describe('matchUtilityStats', () => {
  describe('thrown', () => {
    it('counts every grenade a player threw by kind, including ones that never went off', () => {
      let events = withGrenade(newEvents(), {
        thrower: ct,
        type: 'flashbang',
        throwTick: asTick(300),
      });
      events = withGrenade(events, { thrower: ct, type: 'flashbang', throwTick: asTick(320) });
      events = withGrenade(events, { thrower: ct, type: 'molotov', throwTick: asTick(340) });
      events = withGrenade(events, { thrower: ct, type: 'incgrenade', throwTick: asTick(360) });
      events = withGrenade(events, { thrower: ct, type: 'hegrenade', throwTick: asTick(380) });
      events = withGrenade(events, {
        thrower: terrorist,
        type: 'smokegrenade',
        throwTick: asTick(300),
      });
      events = withGrenade(events, { thrower: ct, type: 'decoy', throwTick: asTick(1500) });

      const row = rowOf(newDemo(events), ct);

      expect(row.thrown).toEqual({ he: 1, flash: 2, smoke: 0, fire: 2, decoy: 0 });
      expect(totalThrown(row.thrown)).toBe(5);
      expect(rowOf(newDemo(events), terrorist).thrown.smoke).toBe(1);
    });

    it('sums a team and states the rounds the team played', () => {
      let events = withGrenade(newEvents(), {
        thrower: ct,
        type: 'hegrenade',
        throwTick: asTick(300),
      });
      events = withGrenade(events, { thrower: ctMate, type: 'hegrenade', throwTick: asTick(310) });

      const [first] = matchUtilityStats(newDemo(events, [round1, round2]));

      expect(first.total.thrown.he).toBe(2);
      expect(first.total.rounds).toBe(2);
    });
  });

  describe('flashes', () => {
    it('counts opponents blinded and their time, and the team flashes separately', () => {
      let events = withGrenade(newEvents(), {
        thrower: ct,
        type: 'flashbang',
        throwTick: asTick(300),
      });
      events = withGrenade(events, { thrower: ct, type: 'flashbang', throwTick: asTick(500) });
      events = withBlind(events, {
        tick: asTick(310),
        attacker: ct,
        victim: terrorist,
        durationSeconds: 2,
      });
      events = withBlind(events, {
        tick: asTick(310),
        attacker: ct,
        victim: terroristMate,
        durationSeconds: 4,
      });
      events = withBlind(events, {
        tick: asTick(510),
        attacker: ct,
        victim: ctMate,
        durationSeconds: 3,
        isTeammate: true,
      });
      events = withBlind(events, {
        tick: asTick(520),
        attacker: ct,
        victim: ct,
        durationSeconds: 3,
        isTeammate: true,
      });

      const row = rowOf(newDemo(events), ct);

      expect(row.enemiesBlinded).toBe(2);
      expect(row.enemyBlindSeconds).toBe(6);
      expect(row.teamFlashes).toBe(1);
      expect(enemiesPerFlash(row)).toBe(1);
      expect(averageEnemyBlind(row)).toBe(3);
    });

    it('has no per-flash or average figure to state without a flash or a blind', () => {
      const row = rowOf(newDemo(newEvents()), ct);

      expect(enemiesPerFlash(row)).toBeNull();
      expect(averageEnemyBlind(row)).toBeNull();
    });

    it('credits the same flash assists as the Players tab', () => {
      let events = withKill(newEvents(), {
        tick: asTick(400),
        attacker: ctMate,
        victim: terrorist,
      });
      events = withBlind(events, {
        tick: asTick(350),
        attacker: ct,
        victim: terrorist,
        durationSeconds: 2,
      });
      events = withBlind(events, {
        tick: asTick(100),
        attacker: ct,
        victim: terrorist,
        durationSeconds: 0.5,
      });
      const demo = newDemo(events);

      const [first, second] = matchPlayerStats(demo);
      const fromPlayers = new Map(
        [...first.players, ...second.players].map((player) => [player.slot, player.flashAssists]),
      );

      expect(rowOf(demo, ct).flashAssists).toBe(1);
      for (const slot of SLOTS) expect(rowOf(demo, slot).flashAssists).toBe(fromPlayers.get(slot));
    });
  });

  describe('unused utility at death', () => {
    function demoWithDeath(bits: number, victimSide: 'CT' | 'T' = 'T') {
      const track = newTrack({ frameCount: 1500 });
      const victim = victimSide === 'T' ? terrorist : ct;
      const killer = victimSide === 'T' ? ct : terrorist;
      // Death at tick 400 is frame 100: the player is alive and holding `bits` on frame 99, dead on 100.
      atFrame(track, asFrame(99), victim, { health: 40, grenades: bits });
      atFrame(track, asFrame(100), victim, { health: 0, grenades: 0 });
      const events = withKill(newEvents(), { tick: asTick(400), attacker: killer, victim });
      return { demo: newDemo(events, [round1], track), victim };
    }

    it('prices what the player held when they died, the second flash and a T molotov included', () => {
      const { demo, victim } = demoWithDeath(
        GRENADE_HE |
          GRENADE_FLASH |
          GRENADE_FLASH_SECOND |
          GRENADE_SMOKE |
          GRENADE_FIRE |
          GRENADE_DECOY,
      );

      // HE 300 + flash 200 + flash 200 + smoke 300 + molotov 400 + decoy 50
      expect(rowOf(demo, victim).unusedDollars).toBe(1450);
      expect(rowOf(demo, victim).unusedGrenades).toBe(6);
    });

    it('prices a CT fire grenade as an incendiary', () => {
      const { demo, victim } = demoWithDeath(GRENADE_FIRE, 'CT');

      expect(rowOf(demo, victim).unusedDollars).toBe(500);
    });

    it('does not price a defuse kit, and a player who lived has nothing unused', () => {
      const { demo, victim } = demoWithDeath(GRENADE_DEFUSE_KIT);

      expect(rowOf(demo, victim).unusedDollars).toBe(0);
      expect(rowOf(demo, ct).unusedDollars).toBe(0);
    });

    it('sums over every death of the match', () => {
      const track = newTrack({ frameCount: 1500 });
      atFrame(track, asFrame(99), terrorist, { health: 40, grenades: GRENADE_HE });
      atFrame(track, asFrame(100), terrorist, { health: 0 });
      atFrame(track, asFrame(599), terrorist, { health: 40, grenades: GRENADE_SMOKE });
      atFrame(track, asFrame(600), terrorist, { health: 0 });
      let events = withKill(newEvents(), { tick: asTick(400), attacker: ct, victim: terrorist });
      events = withKill(events, { tick: asTick(2400), attacker: ct, victim: terrorist });

      const demo = newDemo(events, [round1, round2], track);

      expect(rowOf(demo, terrorist).unusedDollars).toBe(600);
    });
  });
});
