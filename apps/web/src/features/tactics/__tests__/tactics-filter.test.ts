import { decodeTacticFromHash, encodeTacticToHash, type Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { createNewTactic } from '../helpers/editor-actions';
import { filterTactics } from '../helpers/tactics-filter';

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

describe('createNewTactic', () => {
  it('initializes a tactic with default 5 players and 1 step', () => {
    const tactic = createNewTactic('de_dust2', 'CT', 'Dust2 Defense');
    expect(tactic.map).toBe('de_dust2');
    expect(tactic.side).toBe('CT');
    expect(tactic.title).toBe('Dust2 Defense');
    expect(tactic.steps).toHaveLength(1);
    expect(tactic.steps[0]?.players).toHaveLength(5);
    expect(tactic.steps[0]?.timeOffsetSeconds).toBe(0);
  });
});

describe('link sharing codec round-trip', () => {
  it('encodes tactic into a URL fragment and decodes accurately', () => {
    const tactic = createNewTactic('de_anubis', 'T', 'Anubis Mid Rush');
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
