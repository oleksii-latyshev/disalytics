import { describe, expect, it } from 'vitest';
import type { LineupGroup } from '../helpers/lineup-plot';
import { variantsAtHit } from '../hooks/use-lineup-selection';

const lineups = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function group(indices: readonly number[]): LineupGroup {
  return { indices, countLabel: String(indices.length) };
}

describe('variantsAtHit', () => {
  it('lists the lineups that share the hit marker', () => {
    const hit = { index: 0, target: 'origin' as const };

    expect(variantsAtHit(hit, lineups, [group([0, 2])], [])).toEqual({
      type: 'origin',
      ids: ['a', 'c'],
    });
  });

  it('answers null for a marker that stands alone', () => {
    const hit = { index: 1, target: 'landing' as const };

    expect(variantsAtHit(hit, lineups, [], [group([1])])).toBeNull();
  });
});
