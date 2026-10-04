import { decodeTacticFromHash, encodeTacticToHash, type Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { createNewTactic } from '../helpers/tactic-setup';
import { countByMap, filterTactics, isCalledOn } from '../helpers/tactics-filter';

function makeMockTactic(
  id: string,
  title: string,
  map: string,
  side: 'CT' | 'T',
  updatedAt: number,
  author?: string,
  description?: string,
): Tactic {
  return {
    id,
    title,
    map,
    side,
    author,
    description,
    createdAt: updatedAt - 1000,
    updatedAt,
    steps: [
      {
        id: `step-${id}`,
        name: 'Default Execute',
        timeOffsetSeconds: 0,
        players: [],
        throws: [],
        drawings: [],
      },
    ],
  };
}

describe('filterTactics', () => {
  const t1 = makeMockTactic(
    '1',
    'Mirage A Smoke Execute',
    'de_mirage',
    'T',
    300,
    'Coach Alec',
    'Fast A site execute',
  );
  const t2 = makeMockTactic(
    '2',
    'Mirage Mid Split',
    'de_mirage',
    'T',
    200,
    'IGL Alex',
    'Mid to B split',
  );
  const t3 = makeMockTactic(
    '3',
    'Mirage CT Retake A',
    'de_mirage',
    'CT',
    400,
    'Coach Alec',
    'Retake setup',
  );
  const t4 = makeMockTactic(
    '4',
    'Inferno Banana Control',
    'de_inferno',
    'T',
    100,
    'Player One',
    'Car molly and flashes',
  );

  const all = [t1, t2, t3, t4];

  it('sorts tactics by updatedAt descending by default', () => {
    const result = filterTactics(all, {});
    expect(result.map((t) => t.id)).toEqual(['3', '1', '2', '4']);
  });

  it('filters by map', () => {
    const result = filterTactics(all, { map: 'de_inferno' });
    expect(result.map((t) => t.id)).toEqual(['4']);
  });

  it('filters by side', () => {
    const result = filterTactics(all, { side: 'CT' });
    expect(result.map((t) => t.id)).toEqual(['3']);
  });

  it('filters by combined map and side', () => {
    const result = filterTactics(all, { map: 'de_mirage', side: 'T' });
    expect(result.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('filters by text search in title, author, or description', () => {
    const byTitle = filterTactics(all, { search: 'Smoke' });
    expect(byTitle.map((t) => t.id)).toEqual(['1']);

    const byAuthor = filterTactics(all, { search: 'Alec' });
    expect(byAuthor.map((t) => t.id)).toEqual(['3', '1']);

    const byDesc = filterTactics(all, { search: 'Banana' });
    expect(byDesc.map((t) => t.id)).toEqual(['4']);
  });

  it('returns empty array when nothing matches', () => {
    const result = filterTactics(all, { map: 'de_nuke' });
    expect(result).toEqual([]);
  });
});

describe('filtering by round type', () => {
  const pistol = {
    ...makeMockTactic('p', 'Pistol rush', 'de_mirage', 'T', 3),
    rounds: ['pistol'] as const,
  };
  const ecoForce = {
    ...makeMockTactic('ef', 'Cheap A', 'de_mirage', 'T', 2),
    rounds: ['eco', 'force'] as const,
  };
  const anyRound = makeMockTactic('any', 'Default', 'de_mirage', 'T', 1);
  const all = [pistol, ecoForce, anyRound];

  it('keeps tactics called on the round and those that name no round', () => {
    expect(filterTactics(all, { round: 'pistol' }).map((t) => t.id)).toEqual(['p', 'any']);
    expect(filterTactics(all, { round: 'force' }).map((t) => t.id)).toEqual(['ef', 'any']);
    expect(filterTactics(all, { round: 'full' }).map((t) => t.id)).toEqual(['any']);
  });

  it('shows everything for ALL', () => {
    expect(filterTactics(all, { round: 'ALL' })).toHaveLength(3);
  });

  it('treats an empty round list as any round', () => {
    expect(isCalledOn({ ...anyRound, rounds: [] }, 'eco')).toBe(true);
  });
});

describe('link sharing codec round-trip', () => {
  it('encodes tactic into a URL fragment and decodes accurately', () => {
    const tactic = { ...createNewTactic('de_anubis', 'T'), title: 'Anubis Mid Rush' };
    const hash = encodeTacticToHash(tactic);
    expect(hash.startsWith('#tactic=')).toBe(true);

    const decoded = decodeTacticFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(tactic.id);
    expect(decoded?.title).toBe('Anubis Mid Rush');
    expect(decoded?.map).toBe('de_anubis');
    expect(decoded?.steps).toHaveLength(1);
  });
});

describe('countByMap', () => {
  it('counts tactics per map', () => {
    const make = (id: string, map: string) => ({
      ...createNewTactic(map, 'T'),
      id,
    });
    const counts = countByMap([
      make('a', 'de_mirage'),
      make('b', 'de_mirage'),
      make('c', 'de_dust2'),
    ]);
    expect(counts.get('de_mirage')).toBe(2);
    expect(counts.get('de_dust2')).toBe(1);
    expect(counts.get('de_nuke')).toBeUndefined();
  });
});
