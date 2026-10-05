import type { SavedDemo } from '@disa/demo-store';
import { describe, expect, it } from 'vitest';
import { matchRows } from '../helpers/heat-matches';

function saved(key: string, map: string): SavedDemo {
  return {
    key,
    map,
    fileName: `${key}.dem`,
    roundCount: 24,
    score: { startedCt: 13, startedT: 11 },
    storedAt: 0,
    byteLength: 1,
    lastUsedAt: 0,
  };
}

describe('matchRows', () => {
  const library = [
    saved('a', 'de_inferno'),
    saved('b', 'de_dust2'),
    saved('this', 'de_dust2'),
    saved('c', 'de_dust2'),
  ];
  const rows = matchRows(library, { key: 'this', map: 'de_dust2' });

  it('leaves the match on screen out, which the picker lists by itself', () => {
    expect(rows.map((row) => row.key)).not.toContain('this');
  });

  it('puts the matches on the same map first and keeps the catalog order inside each group', () => {
    expect(rows.map((row) => row.key)).toEqual(['b', 'c', 'a']);
    expect(rows.map((row) => row.isSameMap)).toEqual([true, true, false]);
  });

  it('states a score the way the library does', () => {
    expect(rows[0]?.score).toBe('13 : 11');
  });
});
