import type { Tactic, TacticStep } from '@disa/demo-core';
import {
  CONNECTOR_COST_PX,
  floorRefZ,
  getMapOverview,
  loadMapNavGrid,
  mapFloors,
} from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { newStep } from '../helpers/tactic-edits';
import { enemyAt } from '../helpers/tactic-enemy-hit';
import { handleAt, tokenAt } from '../helpers/tactic-hit';
import {
  floorOfPoint,
  toFloorPoint,
  toWorld,
  walkBetween,
  walkRoute,
} from '../helpers/tactic-route';
import { createScene, sampleScene } from '../helpers/tactic-scene';
import { buildSchedule, readLegPosition } from '../helpers/tactic-schedule';
import { originIndexOf, throwOrigins } from '../helpers/tactic-throw-origins';

const nuke = getMapOverview('de_nuke');
const mirage = getMapOverview('de_mirage');
const inferno = getMapOverview('de_inferno');
if (nuke === undefined || mirage === undefined || inferno === undefined) {
  throw new Error('overview missing');
}
const nukeGrid = await loadMapNavGrid('de_nuke');
const mirageGrid = await loadMapNavGrid('de_mirage');

const UPPER = { x: 600, y: 330 };
const LOWER = { x: 700, y: 760 };

describe('points and floors', () => {
  it('reads a point without z as floor 0, one with z by its altitude', () => {
    expect(floorOfPoint(nuke, { x: 0, y: 0 })).toBe(0);
    expect(floorOfPoint(nuke, { x: 0, y: 0, z: -400 })).toBe(0);
    expect(floorOfPoint(nuke, { x: 0, y: 0, z: -700 })).toBe(1);
  });

  it('writes the altitude of the floor a point is made on, and none on a one-floor map', () => {
    expect(toWorld(nuke, LOWER, 1).z).toBe(floorRefZ(nuke, 1));
    expect(toWorld(nuke, LOWER, 0).z).toBe(floorRefZ(nuke, 0));
    expect(toWorld(inferno, LOWER)).not.toHaveProperty('z');
  });

  it('reads back as the floor it was written on', () => {
    for (const overview of [nuke, mirage]) {
      mapFloors(overview).forEach((_, floor) => {
        const world = toWorld(overview, { x: 450, y: 300 }, floor);
        expect(toFloorPoint(overview, world).floor).toBe(floor);
      });
    }
  });
});

describe('walking across floors', () => {
  it('Nuke: a waypoint on the lower floor is reached by a connector, with no break', () => {
    const start = { ...UPPER, floor: 0 };
    const route = { mode: 'points' as const, points: [toWorld(nuke, LOWER, 1)] };
    const walked = walkRoute(nuke, nukeGrid, start, route);
    expect(walked.breaks).toEqual([]);
    expect(walked.points[0]?.floor).toBe(0);
    expect(walked.points[walked.points.length - 1]?.floor).toBe(1);
    const changes = walked.points.filter(
      (point, i) => i > 0 && point.floor !== walked.points[i - 1]?.floor,
    );
    expect(changes).toHaveLength(1);
  });

  it('Nuke: there and back again changes floor twice', () => {
    const start = { ...UPPER, floor: 0 };
    const route = {
      mode: 'points' as const,
      points: [toWorld(nuke, LOWER, 1), toWorld(nuke, { x: 560, y: 340 }, 0)],
    };
    const walked = walkRoute(nuke, nukeGrid, start, route);
    const floors = walked.points.map((point) => point.floor);
    expect(floors[0]).toBe(0);
    expect(floors[floors.length - 1]).toBe(0);
    expect(floors).toContain(1);
  });

  it('Mirage: a waypoint in the underpass is reached from the main floor', () => {
    const route = { mode: 'points' as const, points: [toWorld(mirage, { x: 450, y: 350 }, 1)] };
    const walked = walkRoute(mirage, mirageGrid, { x: 700, y: 600, floor: 0 }, route);
    expect(walked.breaks).toEqual([]);
    expect(walked.points[walked.points.length - 1]?.floor).toBe(1);
  });

  it('keeps a same-floor walk on its floor', () => {
    const walked = walkBetween(
      mirageGrid,
      { x: 700, y: 600, floor: 0 },
      { x: 300, y: 600, floor: 0 },
    );
    expect(walked.reachable).toBe(true);
    expect(walked.points.every((point) => point.floor === 0)).toBe(true);
  });

  it('goes straight, floors kept, with no grid', () => {
    const walked = walkBetween(undefined, { ...UPPER, floor: 0 }, { ...LOWER, floor: 1 });
    expect(walked.points.map((point) => point.floor)).toEqual([0, 1]);
  });

  it('draws a pen stroke as is, each point on the floor it was made on', () => {
    const points = [toWorld(nuke, LOWER, 1), toWorld(nuke, UPPER, 0)];
    const walked = walkRoute(nuke, nukeGrid, { ...UPPER, floor: 0 }, { mode: 'pen', points });
    expect(walked.points.map((point) => point.floor)).toEqual([0, 1, 0]);
  });
});

function tacticOn(
  map: string,
  spawn: { x: number; y: number; z: number },
  steps: readonly TacticStep[],
): Tactic {
  return {
    id: 't',
    title: '',
    map,
    side: 'T',
    spawns: [spawn],
    createdAt: 0,
    updatedAt: 0,
    plans: [{ id: 'root', condition: '', parentId: null, forkAfter: 0, deaths: {}, steps }],
  };
}

describe('scheduling across floors', () => {
  const upperSpawn = { ...toWorld(nuke, UPPER, 0), z: floorRefZ(nuke, 0) };
  const lowerPoint = toWorld(nuke, LOWER, 1);
  const goDown = {
    ...newStep(1),
    id: 'down',
    players: [{ slot: 0, route: { mode: 'points' as const, points: [lowerPoint] } }],
    throws: [
      {
        id: 'smoke',
        throwerSlot: 0,
        kind: 'smoke' as const,
        from: lowerPoint,
        to: toWorld(nuke, { x: 650, y: 760 }, 1),
        releaseTime: 0,
      },
    ],
  };
  const schedule = buildSchedule({
    overview: nuke,
    grid: nukeGrid,
    tactic: tacticOn('de_nuke', upperSpawn, [goDown, { ...newStep(1), id: 'next' }]),
    planId: 'root',
  });
  const leg = schedule.steps[0]?.legs[0];

  it('gives each point of a leg its floor', () => {
    expect(leg?.floors[0]).toBe(0);
    expect(leg?.floors[leg.floors.length - 1]).toBe(1);
  });

  it('counts a connector in the length, so the walk takes longer than its drawn line', () => {
    if (leg === undefined) throw new Error('no leg');
    let drawn = 0;
    for (let i = 1; i < leg.xs.length; i++) {
      drawn += Math.hypot(
        (leg.xs[i] ?? 0) - (leg.xs[i - 1] ?? 0),
        (leg.ys[i] ?? 0) - (leg.ys[i - 1] ?? 0),
      );
    }
    expect(leg.lengthPx).toBeGreaterThanOrEqual(drawn + CONNECTOR_COST_PX - 1e-6);
    expect(leg.runSeconds).toBeCloseTo(leg.lengthPx / schedule.speedPxPerSecond);
  });

  it('reads the floor a player is on while the plan plays', () => {
    if (leg === undefined) throw new Error('no leg');
    const out = new Float64Array(2);
    expect(readLegPosition(leg, 0, schedule.speedPxPerSecond, out, 0)).toBe(0);
    expect(readLegPosition(leg, 999, schedule.speedPxPerSecond, out, 0)).toBe(1);

    const scene = createScene(schedule);
    sampleScene(schedule, 0, scene);
    expect(scene.playerFloor[0]).toBe(0);
    sampleScene(schedule, schedule.steps[1]?.startSeconds ?? 0, scene);
    expect(scene.playerFloor[0]).toBe(1);
  });

  it('starts the next step on the floor the last one ended on', () => {
    expect(schedule.steps[1]?.legs[0]?.floors[0]).toBe(1);
  });

  it('puts a throw on the floor it lands on, and leaves it from the floor of its thrower', () => {
    const thrown = schedule.throws[0];
    expect(thrown?.floor).toBe(1);
    expect(thrown?.fromFloor).toBe(1);
  });

  it('writes the floor of a start and a hand throw origin back as the altitude of that floor', () => {
    const origins = throwOrigins(goDown, schedule.steps[1]?.legs[0], nuke);
    expect(origins[0]?.at.z).toBe(floorRefZ(nuke, 1));
    const thrown = schedule.throws[0];
    if (thrown === undefined) throw new Error('no throw');
    const second = throwOrigins(goDown, leg, nuke);
    expect(originIndexOf(second, thrown, nuke)).toBeGreaterThanOrEqual(0);
  });
});

describe('hit tests on the floor in view', () => {
  const upperSpawn = { ...toWorld(nuke, UPPER, 0) };
  const lowerPoint = toWorld(nuke, LOWER, 1);
  const step = {
    ...newStep(1),
    players: [{ slot: 0, route: { mode: 'points' as const, points: [lowerPoint] } }],
  };
  const tactic = tacticOn('de_nuke', { ...upperSpawn, z: floorRefZ(nuke, 0) }, [step]);
  const schedule = buildSchedule({ overview: nuke, grid: nukeGrid, tactic, planId: 'root' });

  it('finds a waypoint only while its floor is in view', () => {
    const at = toFloorPoint(nuke, lowerPoint);
    expect(handleAt(step, 0, at, nuke, 1, 1)).toBe(0);
    expect(handleAt(step, 0, at, nuke, 1, 0)).toBeNull();
  });

  it('finds a token only while its floor is in view', () => {
    expect(tokenAt(schedule.steps[0], UPPER, 4, 0)).toBe(0);
    expect(tokenAt(schedule.steps[0], UPPER, 4, 1)).toBeNull();
  });

  it('finds an enemy only while its floor is in view', () => {
    const enemy = { id: 'e', at: lowerPoint };
    expect(enemyAt([enemy], toFloorPoint(nuke, lowerPoint), nuke, 1, 1)).toBe('e');
    expect(enemyAt([enemy], toFloorPoint(nuke, lowerPoint), nuke, 1, 0)).toBeNull();
  });
});
