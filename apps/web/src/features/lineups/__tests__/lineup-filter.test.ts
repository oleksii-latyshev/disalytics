import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { filterLineups } from '../helpers/lineup-filter';

const TEST_LINEUPS: readonly Lineup[] = [
  {
    id: '1',
    title: 'Xbox Smoke from T Spawn',
    map: 'de_dust2',
    side: 'T',
    kind: 'smoke',
    origin: { x: -743, y: -1150, z: 172 },
    landing: { x: -312, y: -80, z: -10 },
    pitch: -28.5,
    yaw: 52.3,
    throwType: 'jump',
    movementKeys: ['Jump'],
    movementKeysSummary: 'Jump',
    command: 'setpos -743 -1150 172; setang -28.5 52.3 0',
    notes: 'Wedge into the corner at T Spawn',
    createdAt: 1,
  },
  {
    id: '2',
    title: 'B Doors Flash',
    map: 'de_dust2',
    side: 'CT',
    kind: 'flash',
    origin: { x: -800, y: 1200, z: -40 },
    landing: { x: -500, y: 1500, z: 0 },
    pitch: -40,
    yaw: -120,
    throwType: 'stand',
    movementKeys: ['Stand'],
    movementKeysSummary: 'Stand',
    command: 'setpos -800 1200 -40; setang -40 -120 0',
    notes: 'Throw above doorway',
    createdAt: 2,
  },
  {
    id: '3',
    title: 'Mid Doors HE Grenade',
    map: 'de_dust2',
    side: 'BOTH',
    kind: 'he',
    origin: { x: -400, y: 500, z: 20 },
    landing: { x: -400, y: 800, z: 10 },
    pitch: -15,
    yaw: 90,
    throwType: 'run',
    movementKeys: ['W'],
    movementKeysSummary: 'W',
    command: 'setpos -400 500 20; setang -15 90 0',
    notes: 'High damage over doors',
    createdAt: 3,
  },
];

describe('filterLineups', () => {
  it('returns all lineups when criteria is open', () => {
    const res = filterLineups(TEST_LINEUPS, { side: 'ALL', kind: 'all', search: '' });
    expect(res).toHaveLength(3);
  });

  it('filters by side including BOTH', () => {
    const tOnly = filterLineups(TEST_LINEUPS, { side: 'T', kind: 'all', search: '' });
    expect(tOnly.map((l) => l.id)).toEqual(['1', '3']);

    const ctOnly = filterLineups(TEST_LINEUPS, { side: 'CT', kind: 'all', search: '' });
    expect(ctOnly.map((l) => l.id)).toEqual(['2', '3']);
  });

  it('filters by utility kind', () => {
    const flashes = filterLineups(TEST_LINEUPS, { side: 'ALL', kind: 'flash', search: '' });
    expect(flashes.map((l) => l.id)).toEqual(['2']);

    const smokes = filterLineups(TEST_LINEUPS, { side: 'ALL', kind: 'smoke', search: '' });
    expect(smokes.map((l) => l.id)).toEqual(['1']);
  });

  it('filters by search text in title or notes case-insensitively', () => {
    const byTitle = filterLineups(TEST_LINEUPS, { side: 'ALL', kind: 'all', search: 'xBOx' });
    expect(byTitle.map((l) => l.id)).toEqual(['1']);

    const byNotes = filterLineups(TEST_LINEUPS, { side: 'ALL', kind: 'all', search: 'doorway' });
    expect(byNotes.map((l) => l.id)).toEqual(['2']);
  });

  it('combines side, kind, and search criteria', () => {
    const res = filterLineups(TEST_LINEUPS, { side: 'T', kind: 'smoke', search: 'corner' });
    expect(res.map((l) => l.id)).toEqual(['1']);

    const empty = filterLineups(TEST_LINEUPS, { side: 'CT', kind: 'smoke', search: '' });
    expect(empty).toHaveLength(0);
  });
});
