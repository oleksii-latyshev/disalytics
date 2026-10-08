import { effectiveSteps, type TacticThrow } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  addLineupThrow,
  addStepAfter,
  addThrow,
  addWaypoint,
  clearRoute,
  deleteStep,
  moveWaypoint,
  removeThrow,
  removeWaypoint,
  setDelay,
  setPenRoute,
  setRouteMode,
  setStepStart,
  setTask,
  setThrowFrom,
  setWeapon,
} from '../helpers/tactic-edits';
import { createNewTactic } from '../helpers/tactic-setup';

const base = createNewTactic('de_mirage', 'T');
const planId = base.plans[0]?.id ?? '';
const at = { planId, stepIndex: 0 };
const routeOf = (tactic: typeof base, slot = 0, index = 0) =>
  effectiveSteps(tactic, planId)[index]?.players.find((player) => player.slot === slot)?.route;

describe('route edits', () => {
  it('adds, moves and removes waypoints of a points route', () => {
    let tactic = addWaypoint(base, at, 0, { x: 1, y: 1 });
    tactic = addWaypoint(tactic, at, 0, { x: 2, y: 2 });
    expect(routeOf(tactic)?.points).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    tactic = moveWaypoint(tactic, at, 0, 0, { x: 9, y: 9 });
    expect(routeOf(tactic)?.points[0]).toEqual({ x: 9, y: 9 });
    tactic = removeWaypoint(tactic, at, 0);
    expect(routeOf(tactic)?.points).toEqual([{ x: 9, y: 9 }]);
    expect(routeOf(removeWaypoint(tactic, at, 0, 0))?.points).toEqual([]);
  });

  it('starts a points route over when a pen stroke was there, and a mode change empties it', () => {
    const pen = setPenRoute(base, at, 0, [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(routeOf(pen)?.mode).toBe('pen');
    expect(routeOf(addWaypoint(pen, at, 0, { x: 5, y: 5 }))).toEqual({
      mode: 'points',
      points: [{ x: 5, y: 5 }],
    });
    expect(routeOf(setRouteMode(pen, at, 0, 'points'))).toEqual({ mode: 'points', points: [] });
    expect(routeOf(setRouteMode(pen, at, 0, 'pen'))).toBe(routeOf(pen));
  });

  it('stands still when the route is cleared and keeps the mode', () => {
    const pen = setPenRoute(base, at, 0, [{ x: 1, y: 1 }]);
    expect(routeOf(clearRoute(pen, at, 0))).toEqual({ mode: 'pen', points: [] });
  });
});

describe('step and player fields', () => {
  const player = (tactic: typeof base) =>
    effectiveSteps(tactic, planId)[0]?.players.find((entry) => entry.slot === 0);

  it('keeps delays in half seconds and drops a zero delay', () => {
    expect(player(setDelay(base, at, 0, 1.3))?.delaySeconds).toBe(1.5);
    expect(player(setDelay(setDelay(base, at, 0, 2), at, 0, 0))?.delaySeconds).toBeUndefined();
  });

  it('clears an emptied task and pins or unpins a start', () => {
    expect(player(setTask(base, at, 0, 'hold mid'))?.task).toBe('hold mid');
    expect(player(setTask(setTask(base, at, 0, 'x'), at, 0, ''))?.task).toBeUndefined();
    expect(effectiveSteps(setStepStart(base, at, 40.4), planId)[0]?.startsAt).toBe(40);
    expect(effectiveSteps(setStepStart(base, at, null), planId)[0]?.startsAt).toBeNull();
  });
});

describe('steps and throws', () => {
  it('adds a step after the current one with five idle players and removes it again', () => {
    const added = addStepAfter(base, planId, 0, base.spawns.length);
    const steps = effectiveSteps(added, planId);
    expect(steps).toHaveLength(2);
    expect(steps[1]?.players).toHaveLength(5);
    expect(effectiveSteps(deleteStep(added, planId, 1), planId)).toHaveLength(1);
    expect(effectiveSteps(deleteStep(base, planId, 0), planId)).toHaveLength(1);
  });

  it('sends a lineup thrower to the origin and takes the grenade back out', () => {
    const origin = { x: 100, y: 100 };
    const thrown: TacticThrow = {
      id: 't',
      throwerSlot: 2,
      kind: 'smoke',
      from: origin,
      to: { x: 5, y: 5 },
      releaseTime: 0,
      lineupId: 'l',
    };
    const tactic = addLineupThrow(base, at, thrown, origin);
    const step = effectiveSteps(tactic, planId)[0];
    expect(step?.throws).toHaveLength(1);
    expect(step?.players.find((entry) => entry.slot === 2)?.route.points).toEqual([origin]);
    expect(effectiveSteps(removeThrow(tactic, at, 't'), planId)[0]?.throws).toHaveLength(0);
  });
});

describe('hand throw origin', () => {
  const a = { x: 100, y: 200 };
  const b = { x: 400, y: 200 };
  const hand: TacticThrow = {
    id: 'g',
    throwerSlot: 0,
    kind: 'smoke',
    from: b,
    to: { x: 0, y: 0 },
    releaseTime: 0,
  };
  const routed = addThrow(addWaypoint(addWaypoint(base, at, 0, a), at, 0, b), at, hand);
  const throwOf = (tactic: typeof base) => effectiveSteps(tactic, planId)[0]?.throws[0];

  it('moves a hand throw to another spot of the route', () => {
    expect(throwOf(setThrowFrom(routed, at, 'g', a))?.from).toEqual(a);
  });

  it('leaves a lineup throw where its lineup is', () => {
    const lineup = addThrow(base, at, { ...hand, lineupId: 'l1' });
    expect(throwOf(setThrowFrom(lineup, at, 'g', a))?.from).toEqual(b);
  });

  it('carries a hand throw with the waypoint it stands on', () => {
    const atA = setThrowFrom(routed, at, 'g', { x: a.x + 1, y: a.y });
    const moved = moveWaypoint(atA, at, 0, 0, { x: 150, y: 250 });
    expect(throwOf(moved)?.from).toEqual({ x: 150, y: 250 });
    expect(throwOf(moveWaypoint(routed, at, 0, 0, { x: 150, y: 250 }))?.from).toEqual(b);
describe('setWeapon', () => {
  it('names the gun a slot buys and clears it back to any', () => {
    const armed = setWeapon(setWeapon(base, 0, 'AWP'), 2, 'Galil AR');
    expect(armed.weapons).toEqual({ 0: 'AWP', 2: 'Galil AR' });
    expect(setWeapon(armed, 0, null).weapons).toEqual({ 2: 'Galil AR' });
    expect(setWeapon(setWeapon(armed, 0, null), 2, null).weapons).toBeUndefined();
  });
});
