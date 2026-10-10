import { getMapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { addWaypoint } from '../helpers/tactic-edits';
import { handleAt, tokenAt } from '../helpers/tactic-hit';
import { toRadar } from '../helpers/tactic-route';
import { buildSchedule } from '../helpers/tactic-schedule';
import { createNewTactic } from '../helpers/tactic-setup';

const overview = getMapOverview('de_mirage');
if (overview === undefined) throw new Error('no overview');
const base = createNewTactic('de_mirage', 'T');
const planId = base.plans[0]?.id ?? '';
const routed = addWaypoint(base, { planId, stepIndex: 0 }, 0, { x: 100, y: 100 });
const step = routed.plans[0]?.steps[0];

describe('hit tests', () => {
  it('finds the waypoint of the picked player under the pointer', () => {
    const at = toRadar(overview, { x: 100, y: 100 });
    expect(handleAt(step, 0, { x: at.x + 1, y: at.y }, overview, 1)).toBe(0);
    expect(handleAt(step, 0, { x: at.x + 90, y: at.y }, overview, 1)).toBeNull();
    expect(handleAt(step, null, at, overview, 1)).toBeNull();
    expect(handleAt(step, 1, at, overview, 1)).toBeNull();
  });

  it('finds the token standing at the start of the step', () => {
    const schedule = buildSchedule({ overview, grid: undefined, tactic: base, planId });
    const spawn = toRadar(overview, base.spawns[3] ?? { x: 0, y: 0 });
    expect(tokenAt(schedule.steps[0], spawn, 4)).toBe(3);
    expect(tokenAt(schedule.steps[0], { x: 0, y: 0 }, 4)).toBeNull();
  });
});
