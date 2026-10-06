import { getMapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { addWaypoint } from '../helpers/tactic-edits';
import { createNewTactic } from '../helpers/tactic-setup';
import { tacticSketch } from '../helpers/tactic-trails';

describe('tacticSketch', () => {
  const base = createNewTactic('de_mirage', 'T');
  const at = { planId: base.plans[0]?.id ?? '', stepIndex: 0 };

  it('leaves players who never move without a trail', () => {
    expect(tacticSketch(base)?.trails).toHaveLength(0);
  });

  it('draws a trail for a player with a route', () => {
    const spawn = base.spawns[0] ?? { x: 0, y: 0 };
    const routed = addWaypoint(base, at, 0, { x: spawn.x + 500, y: spawn.y });
    const sketch = tacticSketch(routed);
    expect(sketch?.trails).toHaveLength(1);
    expect(sketch?.trails[0]?.d.startsWith('M')).toBe(true);
  });

  it('marks where smokes land and ignores other grenades', () => {
    const overview = getMapOverview('de_mirage');
    expect(overview).toBeDefined();
    const point = { x: overview?.posX ?? 0, y: overview?.posY ?? 0 };
    const grenade = (id: string, kind: 'smoke' | 'flash') => ({
      id,
      throwerSlot: 0,
      kind,
      from: point,
      to: point,
      releaseTime: 0,
    });
    const tactic = {
      ...base,
      plans: base.plans.map((plan) => ({
        ...plan,
        steps: plan.steps.map((step) => ({
          ...step,
          throws: [grenade('a', 'smoke'), grenade('b', 'flash')],
        })),
      })),
    };
    expect(tacticSketch(tactic)?.smokes).toEqual([{ x: 0, y: 0 }]);
  });

  it('has no sketch for an unknown map', () => {
    expect(tacticSketch({ ...base, map: 'de_nowhere' })).toBeNull();
  });
});
