import type { LineupCollection } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { memberLineupIds, membershipOf } from '../helpers/lineup-collection-membership';

const collection: LineupCollection = {
  id: 'c',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['a', 'b', 'gone'],
  createdAt: 1,
  updatedAt: 1,
};

describe('membershipOf', () => {
  it('says all, some or none', () => {
    expect(membershipOf(collection, ['a', 'b'])).toBe('all');
    expect(membershipOf(collection, ['a', 'z'])).toBe('some');
    expect(membershipOf(collection, ['z'])).toBe('none');
    expect(membershipOf(collection, [])).toBe('none');
  });
});

describe('memberLineupIds', () => {
  it('skips ids with no lineup behind them, keeping order', () => {
    expect(memberLineupIds(collection, new Set(['b', 'a']))).toEqual(['a', 'b']);
  });
});
