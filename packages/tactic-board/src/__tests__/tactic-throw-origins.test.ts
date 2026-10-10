import type { TacticStep } from '@disa/demo-core';
import { getMapOverview, mapSpawns } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { newStep } from '../helpers/tactic-edits';
import { buildSchedule } from '../helpers/tactic-schedule';
import { originIndexOf, throwOrigins } from '../helpers/tactic-throw-origins';

function mirage() {
  const found = getMapOverview('de_mirage');
  if (found === undefined) throw new Error('mirage overview missing');
  return found;
}

const overview = mirage();
const spawn = mapSpawns('de_mirage', 'T')[0] ?? { x: 0, y: 0 };
const a = { x: spawn.x - 400, y: spawn.y };
const b = { x: spawn.x - 800, y: spawn.y };

function scheduleOf(step: TacticStep) {
  return buildSchedule({
    overview,
    grid: undefined,
    planId: 'root',
    tactic: {
      id: 't',
      title: '',
      map: 'de_mirage',
      side: 'T',
      spawns: [spawn],
      createdAt: 0,
      updatedAt: 0,
      plans: [
        { id: 'root', condition: '', parentId: null, forkAfter: 0, deaths: {}, steps: [step] },
      ],
    },
  });
}

describe('throwOrigins', () => {
  it('offers the step start and every waypoint, and finds the one a throw leaves from', () => {
    const step: TacticStep = {
      ...newStep(1),
      id: 's',
      players: [{ slot: 0, route: { mode: 'points', points: [a, b] } }],
      throws: [{ id: 'g', throwerSlot: 0, kind: 'flash', from: a, to: spawn, releaseTime: 0 }],
    };
    const schedule = scheduleOf(step);
    const origins = throwOrigins(step, schedule.steps[0]?.legs[0], overview);
    expect(origins.map((origin) => origin.kind)).toEqual(['start', 'point', 'point']);
    expect(origins[2]?.at).toEqual(b);
    const thrown = schedule.throws[0];
    if (thrown === undefined) throw new Error('no throw');
    expect(originIndexOf(origins, thrown, overview)).toBe(1);
    expect(Math.abs((origins[0]?.at.x ?? NaN) - spawn.x)).toBeLessThanOrEqual(1);
  });

  it('offers only the end of a pen stroke', () => {
    const step: TacticStep = {
      ...newStep(1),
      id: 's',
      players: [{ slot: 0, route: { mode: 'pen', points: [a, b] } }],
    };
    const origins = throwOrigins(step, scheduleOf(step).steps[0]?.legs[0], overview);
    expect(origins.map((origin) => origin.kind)).toEqual(['start', 'end']);
  });
});
