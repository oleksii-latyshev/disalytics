import { getMapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { enemyAt } from '../helpers/tactic-enemy-hit';
import { toRadar } from '../helpers/tactic-route';

const overview = getMapOverview('de_mirage');

describe('enemyAt', () => {
  it('finds the nearest mark within reach and none beyond it', () => {
    if (overview === undefined) throw new Error('de_mirage overview is shipped');
    const near = { id: 'a', at: { x: 0, y: 0 } };
    const far = { id: 'b', at: { x: 400, y: 0 } };
    const at = toRadar(overview, near.at);
    expect(enemyAt([far, near], { x: at.x + 2, y: at.y }, overview, 1)).toBe('a');
    expect(enemyAt([far, near], { x: at.x + 200, y: at.y + 200 }, overview, 1)).toBeNull();
    expect(enemyAt([], at, overview, 1)).toBeNull();
  });
});
