import type { Tactic, TacticStep } from '@disa/demo-core';
import { getMapOverview, loadMapNavGrid, mapSpawns, radarX, radarY } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { newStep } from '../helpers/tactic-edits';
import { createScene, sampleScene } from '../helpers/tactic-scene';
import {
  buildSchedule,
  formatRoundClock,
  GRENADE_FLIGHT_SECONDS,
  MIN_STEP_SECONDS,
  readLegPosition,
  stepIndexAt,
  THROW_WINDUP_SECONDS,
} from '../helpers/tactic-schedule';

const overview = getMapOverview('de_mirage');
if (overview === undefined) throw new Error('mirage overview missing');
const spawn = mapSpawns('de_mirage', 'T')[0] ?? { x: 0, y: 0 };
const ahead = { x: spawn.x - 400, y: spawn.y };

function step(id: string, patch: Partial<TacticStep> = {}): TacticStep {
  return { ...newStep(2), id, ...patch };
}

function tactic(steps: readonly TacticStep[]): Tactic {
  return {
    id: 't',
    title: '',
    map: 'de_mirage',
    side: 'T',
    spawns: [spawn, { x: spawn.x, y: spawn.y + 50 }],
    createdAt: 0,
    updatedAt: 0,
    plans: [{ id: 'root', condition: '', parentId: null, forkAfter: 0, deaths: {}, steps }],
  };
}

const run = (steps: readonly TacticStep[], grid = undefined) =>
  buildSchedule({ overview, grid, tactic: tactic(steps), planId: 'root' });

describe('buildSchedule', () => {
  it('starts every player at their spawn and keeps them there with no route', () => {
    const schedule = run([step('a')]);
    const leg = schedule.steps[0]?.legs[0];
    expect(leg?.lengthPx).toBe(0);
    expect(leg?.xs[0]).toBeCloseTo(radarX(overview, spawn.x));
    expect(schedule.steps[0]?.durationSeconds).toBe(MIN_STEP_SECONDS);
  });

  it('starts the next step where the previous one ended', () => {
    const first = step('a', {
      players: [{ slot: 0, route: { mode: 'points', points: [ahead] } }],
    });
    const schedule = run([first, step('b')]);
    const end = schedule.steps[0]?.legs[0];
    const next = schedule.steps[1]?.legs[0];
    expect(next?.xs[0]).toBeCloseTo(end?.xs[end.xs.length - 1] ?? NaN);
    expect(next?.ys[0]).toBeCloseTo(end?.ys[end.ys.length - 1] ?? NaN);
  });

  it('times the run by distance and adds the delay', () => {
    const route = { mode: 'points' as const, points: [ahead] };
    const plain = run([step('a', { players: [{ slot: 0, route }] })]);
    const delayed = run([step('a', { players: [{ slot: 0, route, delaySeconds: 3 }] })]);
    const leg = plain.steps[0]?.legs[0];
    expect(leg?.runSeconds).toBeCloseTo((leg?.lengthPx ?? 0) / plain.speedPxPerSecond);
    expect(delayed.steps[0]?.legs[0]?.arriveSeconds).toBeCloseTo((leg?.arriveSeconds ?? 0) + 3);
  });

  it('pins a step later than the previous one ends, and flags one pinned too early', () => {
    const route = { mode: 'points' as const, points: [ahead] };
    const first = step('a', { players: [{ slot: 0, route }] });
    const late = run([first, step('b', { startsAt: 60 })]);
    expect(late.steps[1]?.startSeconds).toBe(60);
    expect(late.steps[1]?.isLate).toBe(false);
    const early = run([first, step('b', { startsAt: 0 })]);
    expect(early.steps[1]?.startSeconds).toBeCloseTo(early.steps[0]?.endSeconds ?? NaN);
    expect(early.steps[1]?.isLate).toBe(true);
  });

  it('lets a step last until its grenade lands', () => {
    const thrown = {
      id: 'g',
      throwerSlot: 0,
      kind: 'smoke' as const,
      from: spawn,
      to: ahead,
      releaseTime: 3,
    };
    const schedule = run([step('a', { throws: [thrown] })]);
    const entry = schedule.throws[0];
    expect(entry?.releaseAt).toBeCloseTo(THROW_WINDUP_SECONDS + 3);
    expect(entry?.landAt).toBeCloseTo(THROW_WINDUP_SECONDS + 3 + GRENADE_FLIGHT_SECONDS);
    expect(schedule.steps[0]?.durationSeconds).toBeCloseTo(entry?.landAt ?? NaN);
  });

  it('throws nothing for a player who is dead', () => {
    const base = tactic([
      step('a'),
      step('b', {
        throws: [
          { id: 'g', throwerSlot: 0, kind: 'flash', from: spawn, to: ahead, releaseTime: 0 },
        ],
      }),
    ]);
    const dead = {
      ...base,
      plans: base.plans.map((plan) => ({ ...plan, deaths: { 0: 1 } })),
    };
    const schedule = buildSchedule({ overview, grid: undefined, tactic: dead, planId: 'root' });
    expect(schedule.throws).toHaveLength(0);
    expect(schedule.steps[1]?.legs[0]?.isDead).toBe(true);
  });
});

describe('positions in time', () => {
  it('moves along the route and stops at its end', () => {
    const schedule = run([
      step('a', {
        players: [{ slot: 0, route: { mode: 'points', points: [ahead] }, delaySeconds: 1 }],
      }),
    ]);
    const leg = schedule.steps[0]?.legs[0];
    if (leg === undefined) throw new Error('no leg');
    const out = new Float64Array(2);
    readLegPosition(leg, 0.5, schedule.speedPxPerSecond, out, 0);
    expect(out[0]).toBeCloseTo(leg.xs[0] ?? NaN);
    readLegPosition(leg, 1 + leg.runSeconds / 2, schedule.speedPxPerSecond, out, 0);
    const mid = (leg.xs[0] ?? 0) + ((leg.xs[1] ?? 0) - (leg.xs[0] ?? 0)) / 2;
    expect(out[0]).toBeCloseTo(mid, 3);
    readLegPosition(leg, 99, schedule.speedPxPerSecond, out, 0);
    expect(out[0]).toBeCloseTo(leg.xs[1] ?? NaN);
  });

  it('samples a scene across steps', () => {
    const route = { mode: 'points' as const, points: [ahead] };
    const schedule = run([
      step('a', { players: [{ slot: 0, route }] }),
      step('b', { startsAt: 40 }),
    ]);
    const scene = createScene(schedule);
    sampleScene(schedule, 41, scene);
    expect(stepIndexAt(schedule, 41)).toBe(1);
    expect(scene.stepIndex).toBe(1);
    expect(scene.playerX[0]).toBeCloseTo(radarX(overview, ahead.x), 3);
    expect(scene.playerY[1]).toBeCloseTo(radarY(overview, spawn.y + 50), 3);
  });
});

describe('through the grid', () => {
  it('walks a longer way than the straight line when a wall is between', async () => {
    const grid = await loadMapNavGrid('de_mirage');
    expect(grid).toBeDefined();
    const far = { x: spawn.x - 1500, y: spawn.y + 600 };
    const route = { mode: 'points' as const, points: [far] };
    const walked = run([step('a', { players: [{ slot: 0, route }] })], grid as never);
    const straight = run([step('a', { players: [{ slot: 0, route }] })]);
    expect(walked.steps[0]?.legs[0]?.lengthPx).toBeGreaterThanOrEqual(
      straight.steps[0]?.legs[0]?.lengthPx ?? Infinity,
    );
  });
});

describe('formatRoundClock', () => {
  it('counts down from 1:55', () => {
    expect(formatRoundClock(0)).toBe('1:55');
    expect(formatRoundClock(55)).toBe('1:00');
    expect(formatRoundClock(500)).toBe('0:00');
  });
});
