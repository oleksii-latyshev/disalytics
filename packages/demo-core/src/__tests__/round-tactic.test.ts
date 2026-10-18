import { describe, expect, it } from 'vitest';
import { windowCoordination } from '../helpers/round-coordination';
import { roundTeam, tacticOfRound } from '../helpers/round-tactic';
import { stepCuts } from '../helpers/round-tactic-cuts';
import {
  clampRoundWindow,
  defaultRoundWindow,
  moveWindowEdge,
  POST_PLANT_WINDOW_SECONDS,
} from '../helpers/round-tactic-window';
import type { BombPlant, Grenade, ParsedDemo, PlayerEconomy, Round, Tick } from '../schema';
import { asFrame, asPlayerSlot, asTick, FLAG_ALIVE, WEAPON_NONE } from '../schema';
import { atFrame, newEvents, newTrack, withDamage, withGrenade, withKill } from './helpers';

const TICK_RATE = 64;
const FREEZE_END = 640;
const ROUND_END = FREEZE_END + 60 * TICK_RATE;
const FRAME_COUNT = ROUND_END / 4 + 1;
const second = (seconds: number): Tick => asTick(FREEZE_END + seconds * TICK_RATE);

function economy(): PlayerEconomy[] {
  return Array.from({ length: 10 }, (_, slot) => ({
    slot: asPlayerSlot(slot),
    money: 0,
    equipmentValue: 4000,
    buyType: 'full-buy' as const,
    team: slot < 5 ? ('T' as const) : ('CT' as const),
  }));
}

function round(): Round {
  return {
    number: 2,
    startTick: asTick(0),
    freezeTimeEndTick: asTick(FREEZE_END),
    endTick: asTick(ROUND_END),
    winner: 'T',
    reason: 'bomb-exploded',
    roundTimeSeconds: 115,
    economy: economy(),
  };
}

function plant(seconds: number): BombPlant {
  return { tick: second(seconds), planter: asPlayerSlot(0), site: 'A', detonationTick: null };
}

/** Ten players alive all round; T walks east from x = slot * 100, CT stands. */
function demoWith(build: (events: ReturnType<typeof newEvents>) => ReturnType<typeof newEvents>) {
  const track = newTrack({ frameCount: FRAME_COUNT, tickRate: TICK_RATE });
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    for (let slot = 0; slot < 10; slot++) {
      atFrame(track, asFrame(frame), asPlayerSlot(slot), {
        posX: slot * 3000 + (slot < 5 ? frame * 5 : 0),
        posY: 0,
        health: 100,
        flags: FLAG_ALIVE,
        weapon: WEAPON_NONE,
      });
    }
  }
  const events = build({ ...newEvents(), rounds: [round()] });
  const demo: ParsedDemo = {
    header: {
      map: 'de_mirage',
      tickRate: TICK_RATE,
      players: Array.from({ length: 10 }, (_, slot) => ({
        slot: asPlayerSlot(slot),
        steamId: String(slot),
        name: `p${slot}`,
        team: slot < 5 ? ('T' as const) : ('CT' as const),
      })),
      weapons: ['AK-47'],
    },
    track,
    events,
  };
  return demo;
}

function throwAt(seconds: number, thrower: number, overrides: Partial<Grenade> = {}) {
  return {
    thrower: asPlayerSlot(thrower),
    type: 'smokegrenade' as const,
    throwTick: second(seconds),
    detonationTick: asTick(second(seconds) + 128),
    detonationPosition: { x: thrower * 3000 + 400, y: 80, z: 0 },
    ...overrides,
  };
}

function withThrows(
  events: ReturnType<typeof newEvents>,
  grenades: readonly ReturnType<typeof throwAt>[],
): ReturnType<typeof newEvents> {
  let next = events;
  for (const grenade of grenades) next = withGrenade(next, grenade);
  return next;
}

const withPlant =
  (seconds: number) =>
  (events: ReturnType<typeof newEvents>): ReturnType<typeof newEvents> => ({
    ...events,
    plants: [plant(seconds)],
  });

function input(demo: ParsedDemo, window = defaultRoundWindow(demo, 0)) {
  if (window === undefined) throw new Error('no window');
  const roster = roundTeam(demo, 0, 't');
  if (roster === undefined) throw new Error('no roster');
  return {
    demo,
    roundIndex: 0,
    slots: new Set(roster.slots),
    side: roster.side,
    window,
  };
}

describe('round windows', () => {
  it('runs from freeze end to the round end without a plant', () => {
    const demo = demoWith((events) => events);
    expect(defaultRoundWindow(demo, 0)).toEqual({ startTick: FREEZE_END, endTick: ROUND_END });
  });

  it('runs to ten seconds after the plant', () => {
    const demo = demoWith(withPlant(30));
    expect(defaultRoundWindow(demo, 0)).toEqual({
      startTick: FREEZE_END,
      endTick: second(30 + POST_PLANT_WINDOW_SECONDS),
    });
  });

  it('clamps a window into the live part and keeps a minimum length', () => {
    const demo = demoWith((events) => events);
    expect(
      clampRoundWindow(demo, 0, { startTick: asTick(0), endTick: asTick(ROUND_END + 1000) }),
    ).toEqual({ startTick: FREEZE_END, endTick: ROUND_END });
    const tight = clampRoundWindow(demo, 0, { startTick: second(20), endTick: second(20) });
    expect((tight?.endTick ?? 0) - (tight?.startTick ?? 0)).toBe(5 * TICK_RATE);
  });

  it('is undefined for an unknown round', () => {
    expect(
      defaultRoundWindow(
        demoWith((e) => e),
        3,
      ),
    ).toBeUndefined();
  });
});

describe('moveWindowEdge', () => {
  const demo = demoWith((events) => events);
  const window = { startTick: second(10), endTick: second(40) };

  it('moves one edge and leaves the other', () => {
    expect(moveWindowEdge(demo, 0, window, 'start', second(20))).toEqual({
      startTick: second(20),
      endTick: second(40),
    });
    expect(moveWindowEdge(demo, 0, window, 'end', second(50))?.startTick).toBe(second(10));
  });

  it('stops at the minimum length instead of pushing the other edge', () => {
    const moved = moveWindowEdge(demo, 0, window, 'start', second(45));
    expect(moved?.endTick).toBe(second(40));
    expect((moved?.endTick ?? 0) - (moved?.startTick ?? 0)).toBe(5 * TICK_RATE);
  });

  it('stays inside the live part of the round', () => {
    expect(moveWindowEdge(demo, 0, window, 'start', 0)?.startTick).toBe(FREEZE_END);
    expect(moveWindowEdge(demo, 0, window, 'end', ROUND_END + 999)?.endTick).toBe(ROUND_END);
  });
});

describe('step cuts', () => {
  it('opens with one step when nothing happens', () => {
    const demo = demoWith((events) => events);
    expect(stepCuts(input(demo)).map((cut) => cut.kind)).toEqual(['opening']);
  });

  it('cuts at a utility burst, at its first release', () => {
    const demo = demoWith((events) =>
      withThrows(events, [throwAt(20, 0), throwAt(21, 1, { type: 'flashbang' }), throwAt(22, 2)]),
    );
    const cuts = stepCuts(input(demo));
    expect(cuts.map((cut) => cut.kind)).toEqual(['opening', 'utility']);
    expect(cuts[1]?.tick).toBe(second(20));
  });

  it('does not cut for a lone grenade', () => {
    const demo = demoWith((events) => withGrenade(events, throwAt(20, 0)));
    expect(stepCuts(input(demo)).map((cut) => cut.kind)).toEqual(['opening']);
  });

  it('cuts at first contact, from a kill or damage, and ignores friendly fire', () => {
    const demo = demoWith((events) =>
      withKill(
        withDamage(
          withDamage(events, {
            tick: second(10),
            attacker: asPlayerSlot(1),
            victim: asPlayerSlot(2),
          }),
          {
            tick: second(25),
            attacker: asPlayerSlot(6),
            victim: asPlayerSlot(1),
          },
        ),
        { tick: second(27), attacker: asPlayerSlot(6), victim: asPlayerSlot(1) },
      ),
    );
    const cuts = stepCuts(input(demo));
    expect(cuts.map((cut) => cut.kind)).toEqual(['opening', 'contact']);
    expect(cuts[1]?.tick).toBe(second(25));
  });

  it('merges cuts closer than the minimum, the stronger one winning', () => {
    const demo = demoWith((events) =>
      withDamage(withThrows(events, [throwAt(20, 0), throwAt(21, 1), throwAt(21, 2)]), {
        tick: second(22),
        attacker: asPlayerSlot(6),
        victim: asPlayerSlot(1),
      }),
    );
    const cuts = stepCuts(input(demo));
    expect(cuts.map((cut) => cut.kind)).toEqual(['opening', 'contact']);
  });

  it('makes the post-plant part its own last step: defence on T, retake on CT', () => {
    const demo = demoWith(withPlant(30));
    expect(stepCuts(input(demo)).map((cut) => cut.kind)).toEqual(['opening', 'defence']);
    const roster = roundTeam(demo, 0, 'ct');
    const window = defaultRoundWindow(demo, 0);
    if (roster === undefined || window === undefined) throw new Error('fixture');
    const ct = { demo, roundIndex: 0, slots: new Set(roster.slots), side: roster.side, window };
    expect(stepCuts(ct).map((cut) => cut.kind)).toEqual(['opening', 'retake']);
  });

  it('keeps the plant cut even when a utility cut sits just before it', () => {
    const demo = demoWith((events) =>
      withThrows(withPlant(30)(events), [throwAt(28, 0), throwAt(29, 1), throwAt(29, 2)]),
    );
    expect(stepCuts(input(demo)).map((cut) => cut.kind)).toEqual(['opening', 'defence']);
  });

  it('caps the step count, dropping utility before contact', () => {
    const demo = demoWith((events) => {
      let next = events;
      for (let burst = 0; burst < 12; burst++) {
        next = withGrenade(next, throwAt(8 + burst * 6, 0));
        next = withGrenade(next, throwAt(9 + burst * 6, 1));
        next = withGrenade(next, throwAt(9 + burst * 6, 2));
      }
      return withDamage(next, {
        tick: second(40),
        attacker: asPlayerSlot(6),
        victim: asPlayerSlot(1),
      });
    });
    const cuts = stepCuts(input(demo));
    expect(cuts.length).toBeLessThanOrEqual(8);
    expect(cuts.some((cut) => cut.kind === 'contact')).toBe(true);
  });

  it('drops a final cut that would leave a sliver', () => {
    const demo = demoWith((events) =>
      withThrows(events, [throwAt(58, 0), throwAt(58, 1), throwAt(59, 2)]),
    );
    expect(stepCuts(input(demo)).map((cut) => cut.kind)).toEqual(['opening']);
  });
});

describe('tacticOfRound', () => {
  it('names the team by opening side and reads its side and buy from the round', () => {
    const demo = demoWith((events) => events);
    const result = tacticOfRound(demo, 0, 't', { id: 'tactic-1' });
    expect(result?.side).toBe('T');
    expect(result?.tactic.rounds).toEqual(['full']);
    expect(result?.tactic.map).toBe('de_mirage');
    expect(result?.demoSlots).toEqual([0, 1, 2, 3, 4]);
    expect(tacticOfRound(demo, 0, 'ct', { id: 'x' })?.side).toBe('CT');
  });

  it('places the spawns where the players stand at the window start', () => {
    const demo = demoWith((events) => events);
    const result = tacticOfRound(demo, 0, 't', { id: 't' });
    const startFrame = FREEZE_END / 4;
    expect(result?.tactic.spawns[1]).toEqual({ x: 3000 + startFrame * 5, y: 0 });
  });

  it('pins each step to its cut time in seconds from the window start', () => {
    const demo = demoWith((events) =>
      withDamage(events, { tick: second(25), attacker: asPlayerSlot(6), victim: asPlayerSlot(1) }),
    );
    const result = tacticOfRound(demo, 0, 't', { id: 't' });
    expect(result?.stepStartSeconds).toEqual([0, 25]);
    expect(result?.tactic.plans[0]?.steps.map((step) => step.startsAt)).toEqual([0, 25]);
  });

  it('simplifies a straight walk to a single waypoint', () => {
    const demo = demoWith((events) => events);
    const route = tacticOfRound(demo, 0, 't', { id: 't' })?.tactic.plans[0]?.steps[0]?.players[0]
      ?.route;
    expect(route?.mode).toBe('points');
    expect(route?.points).toHaveLength(1);
  });

  it('shows a player who stays put as standing', () => {
    const demo = demoWith((events) => events);
    const route = tacticOfRound(demo, 0, 'ct', { id: 't' })?.tactic.plans[0]?.steps[0]?.players[0]
      ?.route;
    expect(route?.points).toEqual([]);
  });

  it('ends a dead player route at the death spot and records the step after it', () => {
    const demo = demoWith((events) =>
      withKill(
        withDamage(events, {
          tick: second(25),
          attacker: asPlayerSlot(6),
          victim: asPlayerSlot(1),
        }),
        { tick: second(35), attacker: asPlayerSlot(6), victim: asPlayerSlot(1) },
      ),
    );
    const result = tacticOfRound(demo, 0, 't', { id: 't' });
    const steps = result?.tactic.plans[0]?.steps ?? [];
    expect(result?.tactic.plans[0]?.deaths).toEqual({ 1: 2 });
    const deathFrame = (second(35) as number) / 4;
    expect(steps[1]?.players[1]?.route.points.at(-1)).toEqual({
      x: 3000 + deathFrame * 5,
      y: 0,
    });
  });

  it('records a death in the first step as 1 and a player dead at the start as 0', () => {
    const demo = demoWith((events) =>
      withKill(events, { tick: second(3), attacker: asPlayerSlot(6), victim: asPlayerSlot(2) }),
    );
    expect(tacticOfRound(demo, 0, 't', { id: 't' })?.tactic.plans[0]?.deaths).toEqual({ 2: 1 });

    const track = demo.track;
    const late = clampRoundWindow(demo, 0, { startTick: second(10), endTick: asTick(ROUND_END) });
    for (let frame = second(5) / 4; frame < FRAME_COUNT; frame++) {
      atFrame(track, asFrame(frame), asPlayerSlot(3), { flags: 0 });
    }
    const result = tacticOfRound(demo, 0, 't', { id: 't', window: late });
    expect(result?.tactic.plans[0]?.deaths[3]).toBe(0);
  });

  it('turns the team grenades into throws in the step they left in', () => {
    const demo = demoWith((events) =>
      withGrenade(
        withGrenade(withPlant(40)(events), throwAt(10, 0)),
        throwAt(45, 2, { type: 'incgrenade' }),
      ),
    );
    const result = tacticOfRound(demo, 0, 't', { id: 't' });
    const steps = result?.tactic.plans[0]?.steps ?? [];
    expect(steps).toHaveLength(2);
    expect(steps[0]?.throws).toHaveLength(1);
    expect(steps[0]?.throws[0]).toMatchObject({
      throwerSlot: 0,
      kind: 'smoke',
      to: { x: 400, y: 80 },
      releaseTime: 0,
    });
    expect(steps[1]?.throws[0]).toMatchObject({ throwerSlot: 2, kind: 'fire' });
  });

  it('names a teammate with room as the dropper of a grenade over the carry limit', () => {
    const demo = demoWith((events) =>
      withThrows(events, [throwAt(10, 0), throwAt(15, 1), throwAt(20, 0)]),
    );
    const throws =
      tacticOfRound(demo, 0, 't', { id: 't' })?.tactic.plans[0]?.steps.flatMap(
        (step) => step.throws,
      ) ?? [];
    expect(throws.map((thrown) => [thrown.throwerSlot, thrown.droppedBy])).toEqual([
      [0, undefined],
      [1, undefined],
      [0, 2],
    ]);
  });

  it('leaves the other team grenades out and skips one that never landed', () => {
    const demo = demoWith((events) =>
      withGrenade(
        withGrenade(events, throwAt(10, 7)),
        throwAt(12, 0, { detonationPosition: null }),
      ),
    );
    const steps = tacticOfRound(demo, 0, 't', { id: 't' })?.tactic.plans[0]?.steps ?? [];
    expect(steps[0]?.throws).toEqual([]);
  });

  it('is deterministic', () => {
    const demo = demoWith(withPlant(30));
    expect(tacticOfRound(demo, 0, 't', { id: 't' })).toEqual(
      tacticOfRound(demo, 0, 't', { id: 't' }),
    );
  });

  it('cuts a custom window', () => {
    const demo = demoWith((events) => events);
    const window = { startTick: second(10), endTick: second(30) };
    const result = tacticOfRound(demo, 0, 't', { id: 't', window });
    expect(result?.window).toEqual(window);
    expect(result?.tactic.spawns[0]?.x).toBe((second(10) / 4) * 5);
  });
});

describe('windowCoordination', () => {
  it('reads a quiet round as loose', () => {
    const demo = demoWith((events) => events);
    expect(windowCoordination(input(demo))).toEqual({ level: 'loose', signals: [] });
  });

  it('counts a burst from two players, a group and a plant as coordinated', () => {
    const demo = demoWith((events) =>
      withThrows(withPlant(40)(events), [throwAt(20, 0), throwAt(21, 1), throwAt(22, 2)]),
    );
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      for (const slot of [0, 1, 2]) {
        atFrame(demo.track, asFrame(frame), asPlayerSlot(slot), { posX: slot * 100 });
      }
    }
    const signals = windowCoordination(input(demo));
    expect(signals.signals).toEqual(['utilityBurst', 'grouped', 'plant']);
    expect(signals.level).toBe('coordinated');
  });

  it('does not count a burst thrown by one player', () => {
    const demo = demoWith((events) =>
      withThrows(events, [throwAt(20, 0), throwAt(21, 0), throwAt(22, 0)]),
    );
    expect(windowCoordination(input(demo)).signals).not.toContain('utilityBurst');
  });

  it('counts a traded death', () => {
    const demo = demoWith((events) =>
      withKill(
        withKill(events, { tick: second(30), attacker: asPlayerSlot(6), victim: asPlayerSlot(1) }),
        {
          tick: second(32),
          attacker: asPlayerSlot(2),
          victim: asPlayerSlot(6),
        },
      ),
    );
    expect(windowCoordination(input(demo)).signals).toContain('trade');
  });

  it('ignores the plant for the CT side', () => {
    const demo = demoWith(withPlant(30));
    const roster = roundTeam(demo, 0, 'ct');
    const window = defaultRoundWindow(demo, 0);
    if (roster === undefined || window === undefined) throw new Error('fixture');
    const ct = { demo, roundIndex: 0, slots: new Set(roster.slots), side: roster.side, window };
    expect(windowCoordination(ct).signals).not.toContain('plant');
  });
});
