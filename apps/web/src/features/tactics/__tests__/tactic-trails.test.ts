import type { Tactic, TacticStep } from '@disa/demo-core';
import { getMapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { createNewTactic } from '../helpers/tactic-setup';
import { tacticSketch } from '../helpers/tactic-trails';

describe('tacticSketch', () => {
  const base = createNewTactic('de_mirage', 'T');
  const first = base.steps[0] as TacticStep;

  it('leaves players who never move without a trail', () => {
    const sketch = tacticSketch(base);
    expect(sketch?.trails).toHaveLength(0);
  });

  it('draws a trail for a player who moves between steps', () => {
    const moved: TacticStep = {
      ...first,
      id: 'second',
      players: first.players.map((p) => (p.slot === 0 ? { ...p, x: p.x + 500 } : p)),
    };
    const tactic: Tactic = { ...base, steps: [first, moved] };
    const sketch = tacticSketch(tactic);
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
    const tactic: Tactic = {
      ...base,
      steps: [{ ...first, throws: [grenade('a', 'smoke'), grenade('b', 'flash')] }],
    };
    expect(tacticSketch(tactic)?.smokes).toEqual([{ x: 0, y: 0 }]);
  });

  it('has no sketch for an unknown map', () => {
    expect(tacticSketch({ ...base, map: 'de_nowhere' })).toBeNull();
  });
});
