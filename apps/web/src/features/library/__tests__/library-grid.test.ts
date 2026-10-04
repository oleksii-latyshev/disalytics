import type { SavedDemo } from '@disa/demo-store';
import { describe, expect, it } from 'vitest';
import {
  budgetShares,
  freeBytes,
  mapCounts,
  matchesFilter,
  sortDemos,
  stripRows,
} from '../helpers/library-grid';

function demo(key: string, storedAt: number, map = 'de_mirage'): SavedDemo {
  return {
    key,
    map,
    storedAt,
    fileName: `${key}.dem`,
    byteLength: 1,
    lastUsedAt: 0,
    roundCount: 0,
    score: { startedCt: 0, startedT: 0 },
  };
}

describe('mapCounts', () => {
  it('counts per map, most played first, ties by name', () => {
    const counts = mapCounts([
      { map: 'de_nuke' },
      { map: 'de_mirage' },
      { map: 'de_nuke' },
      { map: 'de_dust2' },
    ]);
    expect(counts).toEqual([
      { map: 'de_nuke', count: 2 },
      { map: 'de_dust2', count: 1 },
      { map: 'de_mirage', count: 1 },
    ]);
  });
});

describe('matchesFilter', () => {
  const subject = {
    map: 'de_mirage',
    fileName: 'final-1.dem',
    teams: ['Natus Vincere', 'Vitality'],
  };

  it('filters by map', () => {
    expect(matchesFilter(subject, { map: 'de_mirage', query: '' })).toBe(true);
    expect(matchesFilter(subject, { map: 'de_nuke', query: '' })).toBe(false);
  });

  it('finds by team, map or file name, any case, every word', () => {
    expect(matchesFilter(subject, { map: null, query: 'vitality' })).toBe(true);
    expect(matchesFilter(subject, { map: null, query: 'MIRAGE final' })).toBe(true);
    expect(matchesFilter(subject, { map: null, query: 'vitality dust' })).toBe(false);
    expect(matchesFilter(subject, { map: null, query: '   ' })).toBe(true);
  });
});

describe('sortDemos', () => {
  it('orders by when it was saved without touching the input', () => {
    const input = [demo('b', 2), demo('a', 1), demo('c', 3)];
    expect(sortDemos(input, 'newest').map((d) => d.key)).toEqual(['c', 'b', 'a']);
    expect(sortDemos(input, 'oldest').map((d) => d.key)).toEqual(['a', 'b', 'c']);
    expect(input.map((d) => d.key)).toEqual(['b', 'a', 'c']);
  });
});

describe('stripRows', () => {
  const rounds = (count: number) => Array.from({ length: count }, () => 'ct' as const);

  it('is one regulation row with a halftime for a match that ended in regulation', () => {
    const rows = stripRows(rounds(19));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells).toHaveLength(19);
    expect(rows[0]?.halftimeAt).toBe(12);
    expect(rows[0]?.overtime).toBeNull();
  });

  it('adds a row of six per overtime block, numbered from one', () => {
    const rows = stripRows(rounds(36));
    expect(rows.map((row) => row.cells.length)).toEqual([24, 6, 6]);
    expect(rows.map((row) => row.overtime)).toEqual([null, 1, 2]);
    expect(rows[2]?.cells[0]?.number).toBe(31);
  });

  it('is empty-celled for no rounds rather than failing', () => {
    expect(stripRows([])[0]?.cells).toEqual([]);
  });
});

describe('budget', () => {
  it('states each size as a share of the budget', () => {
    expect(budgetShares([25, 50], 100)).toEqual([25, 50]);
  });

  it('never draws past the whole bar', () => {
    const shares = budgetShares([300, 300], 400);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(100);
  });

  it('leaves nothing free when over', () => {
    expect(freeBytes(10, 100)).toBe(90);
    expect(freeBytes(150, 100)).toBe(0);
  });
});
