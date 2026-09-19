import 'fake-indexeddb/auto';
import type { Tactic } from '@disa/demo-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTacticStore, type TacticStore } from '../tactic-store';

const tacticA: Tactic = {
  id: 'dust2-a-split',
  title: 'A Short / Long Split',
  map: 'de_dust2',
  side: 'T',
  createdAt: 1000,
  updatedAt: 1000,
  steps: [
    {
      id: 'step-1',
      name: 'Default control',
      timeOffsetSeconds: 0,
      players: [
        { slot: 0, x: -100, y: 200 },
        { slot: 1, x: -200, y: 300 },
      ],
      throws: [],
    },
  ],
};

const tacticB: Tactic = {
  id: 'dust2-b-retake',
  title: 'B Site Retake',
  map: 'de_dust2',
  side: 'CT',
  createdAt: 2000,
  updatedAt: 2000,
  steps: [
    {
      id: 'step-1',
      name: 'Retake start',
      timeOffsetSeconds: 0,
      players: [{ slot: 0, x: 500, y: 600 }],
      throws: [],
    },
  ],
};

const tacticC: Tactic = {
  id: 'mirage-a-execute',
  title: 'Mirage A Execute',
  map: 'de_mirage',
  side: 'T',
  createdAt: 3000,
  updatedAt: 3000,
  steps: [
    {
      id: 'step-1',
      name: 'Lineup phase',
      timeOffsetSeconds: 0,
      players: [{ slot: 0, x: -1000, y: -500 }],
      throws: [],
    },
  ],
};

describe('TacticStore (IndexedDB)', () => {
  let store: TacticStore;

  beforeEach(async () => {
    const opened = await openTacticStore();
    if (opened === null) throw new Error('Expected tactic store to open');
    store = opened;
    await store.clear();
  });

  afterEach(async () => {
    await store.clear();
    store.close();
  });

  it('puts and gets a tactic by id', async () => {
    await store.put(tacticA);
    const retrieved = await store.get('dust2-a-split');

    expect(retrieved).toEqual(tacticA);
  });

  it('returns null when tactic is not found', async () => {
    const missing = await store.get('non-existent');
    expect(missing).toBeNull();
  });

  it('saves multiple tactics with putMany and lists all', async () => {
    await store.putMany([tacticA, tacticB, tacticC]);
    const all = await store.list();

    expect(all).toHaveLength(3);
    const ids = all.map((t) => t.id);
    expect(ids).toContain('dust2-a-split');
    expect(ids).toContain('dust2-b-retake');
    expect(ids).toContain('mirage-a-execute');
  });

  it('filters by map', async () => {
    await store.putMany([tacticA, tacticB, tacticC]);

    const dust2 = await store.list({ map: 'de_dust2' });
    expect(dust2).toHaveLength(2);
    expect(dust2.every((t) => t.map === 'de_dust2')).toBe(true);

    const mirage = await store.list({ map: 'de_mirage' });
    expect(mirage).toHaveLength(1);
    expect(mirage[0]?.id).toBe('mirage-a-execute');
  });

  it('filters by side', async () => {
    await store.putMany([tacticA, tacticB, tacticC]);

    const tTactics = await store.list({ side: 'T' });
    expect(tTactics).toHaveLength(2);
    expect(tTactics.map((t) => t.id)).toEqual(
      expect.arrayContaining(['dust2-a-split', 'mirage-a-execute']),
    );

    const ctTactics = await store.list({ side: 'CT' });
    expect(ctTactics).toHaveLength(1);
    expect(ctTactics[0]?.id).toBe('dust2-b-retake');
  });

  it('filters by both map and side', async () => {
    await store.putMany([tacticA, tacticB, tacticC]);

    const dust2T = await store.list({ map: 'de_dust2', side: 'T' });
    expect(dust2T).toHaveLength(1);
    expect(dust2T[0]?.id).toBe('dust2-a-split');

    const mirageCT = await store.list({ map: 'de_mirage', side: 'CT' });
    expect(mirageCT).toHaveLength(0);
  });

  it('deletes a tactic by id', async () => {
    await store.put(tacticA);
    expect(await store.get('dust2-a-split')).not.toBeNull();

    await store.delete('dust2-a-split');
    expect(await store.get('dust2-a-split')).toBeNull();
  });

  it('clears all tactics', async () => {
    await store.putMany([tacticA, tacticB]);
    expect(await store.list()).toHaveLength(2);

    await store.clear();
    expect(await store.list()).toHaveLength(0);
  });
});
