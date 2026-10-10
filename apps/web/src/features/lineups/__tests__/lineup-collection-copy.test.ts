import type { LineupCollection } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { copyOfCollection } from '../helpers/lineup-collection-copy';

const builtIn: LineupCollection = {
  id: 'exec-b',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['a', 'b'],
  createdAt: 1,
  updatedAt: 1,
  isBuiltIn: true,
};

describe('copyOfCollection', () => {
  it('keeps the lineups and the map, takes a new id and loses the built-in mark', () => {
    const copy = copyOfCollection(builtIn, [builtIn], 'Execute B (copy)', 'mine-1', 50);

    expect(copy).toEqual({
      id: 'mine-1',
      name: 'Execute B (copy)',
      map: 'de_mirage',
      lineupIds: ['a', 'b'],
      createdAt: 50,
      updatedAt: 50,
    });
    expect('isBuiltIn' in copy).toBe(false);
  });

  it('numbers the name when the copy was made before, whatever the case', () => {
    const first = copyOfCollection(builtIn, [builtIn], 'Execute B (copy)', 'mine-1', 50);
    const again = copyOfCollection(
      builtIn,
      [builtIn, { ...first, name: 'execute b (COPY)' }],
      'Execute B (copy)',
      'mine-2',
      60,
    );

    expect(again.name).toBe('Execute B (copy) 2');
  });
});
