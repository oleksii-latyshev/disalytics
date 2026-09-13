import { describe, expect, it } from 'vitest';
import { type HeatMode, type HeatScope, walkHeat } from '../helpers/heat';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  FLAG_ALIVE,
  type MatchEvents,
  type ParsedDemo,
  type Round,
  type Team,
} from '../schema';
import { atFrame, newEvents, newTrack, withDamage, withGrenade, withKill } from './helpers';

// 64 ticks to 16 samples: frame = tick / 4.
const ct = asPlayerSlot(0);
const t = asPlayerSlot(1);

const CT_AT = { posX: 100, posY: 200 };
const T_AT = { posX: -300, posY: 400 };

/** One round on frames 0–7, freeze time over after frame 2, with the given sides. */
function newRound(sides: readonly [Team, Team] = ['CT', 'T']): Round {
  return {
    number: 1,
    startTick: asTick(0),
    freezeTimeEndTick: asTick(8),
    endTick: asTick(28),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [
      { slot: ct, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[0] },
      { slot: t, money: 0, equipmentValue: 0, buyType: 'full-buy', team: sides[1] },
    ],
  };
}

/** Both alive at their spots on every frame, T at 60 health, CT at 100. */
function newDemo(events: MatchEvents, sides?: readonly [Team, Team]): ParsedDemo {
  const track = newTrack({ frameCount: 8, slotCount: 2 });

  for (let frame = 0; frame < 8; frame++) {
    atFrame(track, asFrame(frame), ct, { ...CT_AT, health: 100, flags: FLAG_ALIVE });
    atFrame(track, asFrame(frame), t, { ...T_AT, health: 60, flags: FLAG_ALIVE });
  }

  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track,
    events: { ...events, rounds: [newRound(sides)] },
  };
}

const WHOLE: HeatScope = { side: null, subject: null };

function visits(demo: ParsedDemo, mode: HeatMode, scope: HeatScope = WHOLE) {
  const points: [number, number, number][] = [];
  const tally = walkHeat(demo, mode, scope, (x, y, weight) => points.push([x, y, weight]));

  return { points, tally };
}

describe('walkHeat', () => {
  it('weighs presence in seconds from the end of freeze time', () => {
    const { points, tally } = visits(newDemo(newEvents()), 'presence');

    // Frames 2–7 for both players: 6 samples each at 1/16 s.
    expect(points).toHaveLength(12);
    expect([...tally.bySlot]).toEqual([6 / 16, 6 / 16]);
    expect(tally.total).toBeCloseTo(12 / 16, 5);
  });

  it('puts dealt damage on the attacker and taken damage on the victim, clamped to the health left', () => {
    const events = withDamage(newEvents(), {
      tick: asTick(20),
      attacker: ct,
      victim: t,
      healthDamage: 452,
    });

    expect(visits(newDemo(events), 'damageDealt').points).toEqual([[100, 200, 60]]);
    expect(visits(newDemo(events), 'damageTaken').points).toEqual([[-300, 400, 60]]);
  });

  it('leaves out damage to a teammate, read against the round rather than the roster', () => {
    const events = withDamage(newEvents(), { tick: asTick(20), attacker: ct, victim: t });

    expect(visits(newDemo(events, ['T', 'T']), 'damageDealt').points).toEqual([]);
  });

  it('puts a kill on the killer and a death on the victim, a world death included', () => {
    const events = withKill(withKill(newEvents(), { tick: asTick(12), attacker: ct, victim: t }), {
      tick: asTick(16),
      attacker: null,
      victim: ct,
    });

    expect(visits(newDemo(events), 'kills').points).toEqual([[100, 200, 1]]);
    expect(visits(newDemo(events), 'deaths').points).toEqual([
      [-300, 400, 1],
      [100, 200, 1],
    ]);
  });

  it('puts utility where it went off, and nowhere for a grenade that never did', () => {
    const events = withGrenade(
      withGrenade(newEvents(), {
        thrower: t,
        throwTick: asTick(12),
        detonationTick: asTick(20),
        detonationPosition: { x: 7, y: 8, z: 0 },
      }),
      { thrower: ct, throwTick: asTick(14), detonationTick: null, detonationPosition: null },
    );

    expect(visits(newDemo(events), 'utility').points).toEqual([[7, 8, 1]]);
  });

  it('leaves an event after the round ended out of every mode', () => {
    const events = withKill(newEvents(), { tick: asTick(40), attacker: ct, victim: t });

    expect(visits(newDemo(events), 'kills').points).toEqual([]);
  });

  it('narrows by the side that round and by the subject, keeping the side figures', () => {
    const events = withKill(withKill(newEvents(), { tick: asTick(12), attacker: ct, victim: t }), {
      tick: asTick(16),
      attacker: t,
      victim: ct,
    });

    expect(visits(newDemo(events), 'kills', { side: 'T', subject: null }).points).toEqual([
      [-300, 400, 1],
    ]);

    const { points, tally } = visits(newDemo(events), 'kills', { side: null, subject: t });
    expect(points).toEqual([[-300, 400, 1]]);
    expect([...tally.bySlot]).toEqual([1, 1]);
    expect(tally.total).toBe(1);
  });
});
