import type { Lineup, LineupCollection } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  combineCollections,
  combineLineups,
  withoutBuiltInCopies,
} from '../helpers/lineup-catalog';

const bundled: Lineup = {
  id: 'mirage-smoke-1',
  title: 'Bundled smoke',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 10, y: 20, z: 0 },
  landing: { x: 30, y: 40, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  isBuiltIn: true,
};

describe('combineLineups', () => {
  it('shows a saved edit once and uses its changed coordinates', () => {
    const edited: Lineup = {
      ...bundled,
      origin: { x: 50, y: 60, z: 0 },
      isBuiltIn: false,
    };
    const other: Lineup = { ...bundled, id: 'mirage-flash-2', kind: 'flash' };

    expect(combineLineups([edited], [bundled, other])).toEqual([edited, other]);
  });

  it('shows an unchanged stored copy as the built-in', () => {
    const copy: Lineup = { ...bundled, isBuiltIn: false };

    expect(combineLineups([copy], [bundled])).toEqual([bundled]);
  });
});

describe('withoutBuiltInCopies', () => {
  it('keeps edits and own lineups, drops unchanged copies whatever their key order', () => {
    const { id, ...rest } = bundled;
    const reordered: Lineup = { ...rest, isBuiltIn: false, id };
    const edited: Lineup = { ...bundled, title: 'Renamed', isBuiltIn: false };
    const own: Lineup = { ...bundled, id: 'custom-1', isBuiltIn: false };

    expect(withoutBuiltInCopies([reordered, own], [bundled])).toEqual([own]);
    expect(withoutBuiltInCopies([edited], [bundled])).toEqual([edited]);
  });
});

const executeB: LineupCollection = {
  id: 'exec-b',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['a'],
  createdAt: 1,
  updatedAt: 1,
};

describe('combineCollections', () => {
  it('lists the built-in collections first, marked, then the reader’s own', () => {
    const own: LineupCollection = { ...executeB, id: 'mine', name: 'Mine' };

    const combined = combineCollections([own], [executeB]);

    expect(combined.map(({ id }) => id)).toEqual(['exec-b', 'mine']);
    expect(combined.map(({ isBuiltIn }) => isBuiltIn)).toEqual([true, undefined]);
  });

  it('hides a stored collection that has a built-in one’s id, and shows the built-in', () => {
    const shadow: LineupCollection = { ...executeB, name: 'Old name', lineupIds: [] };

    const combined = combineCollections([shadow], [{ ...executeB, isBuiltIn: true }]);

    expect(combined).toEqual([{ ...executeB, isBuiltIn: true }]);
  });

  it('is only the reader’s own when the API has none', () => {
    expect(combineCollections([executeB], [])).toEqual([executeB]);
  });
});
