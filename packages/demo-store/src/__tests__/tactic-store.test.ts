import 'fake-indexeddb/auto';
import { effectiveSteps, type Tactic } from '@disa/demo-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTacticStore, type TacticStore } from '../tactic-store';

function tacticOf(
  id: string,
  title: string,
  map: string,
  side: 'CT' | 'T',
  stamp: number,
  at: { readonly x: number; readonly y: number },
): Tactic {
  return {
    id,
    title,
    map,
    side,
    createdAt: stamp,
    updatedAt: stamp,
    spawns: [at],
    plans: [
      {
        id: 'main',
        condition: title,
        parentId: null,
        forkAfter: 0,
        deaths: {},
        steps: [
          {
            id: 'step-1',
            name: title,
            startsAt: null,
            players: [{ slot: 0, route: { mode: 'points', points: [at] } }],
            throws: [],
          },
        ],
      },
    ],
  };
}

const tacticA = tacticOf('dust2-a-split', 'A Short / Long Split', 'de_dust2', 'T', 1000, {
  x: -100,
  y: 200,
});
const tacticB = tacticOf('dust2-b-retake', 'B Site Retake', 'de_dust2', 'CT', 2000, {
  x: 500,
  y: 600,
});
const tacticC = tacticOf('mirage-a-execute', 'Mirage A Execute', 'de_mirage', 'T', 3000, {
  x: -1000,
  y: -500,
});

const legacyRecord = {
  id: 'legacy-1',
  title: 'Stored before tactics v2',
  map: 'de_dust2',
  side: 'T',
  createdAt: 10,
  updatedAt: 20,
  steps: [
    {
      id: 'step-1',
      name: 'Setup',
      timeOffsetSeconds: 0,
      players: [{ slot: 0, x: -100, y: 200 }],
      throws: [],
    },
    {
      id: 'step-2',
      name: 'Go',
      timeOffsetSeconds: 8,
      players: [{ slot: 0, x: 300, y: 400 }],
      throws: [],
    },
  ],
};

function writeRaw(record: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('disalytics-user-tactics', 2);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      const transaction = db.transaction('tactics', 'readwrite');
      transaction.objectStore('tactics').put(record);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

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

  it('migrates a tactic stored before version 2 on read', async () => {
    await writeRaw(legacyRecord);

    const migrated = await store.get('legacy-1');
    expect(migrated?.plans).toHaveLength(1);
    const steps = migrated === null ? [] : effectiveSteps(migrated, 'main');
    expect(steps.map((step) => step.startsAt)).toEqual([null, 8]);
    expect(steps[1]?.players[0]?.route.points).toEqual([{ x: 300, y: 400 }]);
    expect(migrated?.spawns).toEqual([{ x: -100, y: 200 }]);

    const listed = await store.list({ map: 'de_dust2', side: 'T' });
    expect(listed.map((tactic) => tactic.id)).toEqual(['legacy-1']);
  });

  it("fills a migrated tactic spawns from the reader's resolver", async () => {
    await writeRaw(legacyRecord);
    store.close();
    const opened = await openTacticStore({ spawnsFor: () => [{ x: 7, y: 8 }] });
    if (opened === null) throw new Error('Expected tactic store to open');
    store = opened;

    expect((await store.get('legacy-1'))?.spawns).toEqual([{ x: 7, y: 8 }]);
  });

  it('writes the current shape, so a migrated tactic reads back as stored', async () => {
    await writeRaw(legacyRecord);
    const migrated = await store.get('legacy-1');
    if (migrated === null) throw new Error('Expected a migrated tactic');

    await store.put(migrated);
    expect(await store.get('legacy-1')).toEqual(migrated);
  });

  it('skips a record that is no tactic at all', async () => {
    await writeRaw({ id: 'junk', map: 'de_dust2', side: 'T' });
    await store.put(tacticA);
    expect((await store.list()).map((tactic) => tactic.id)).toEqual(['dust2-a-split']);
  });
});

function dropDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleting = indexedDB.deleteDatabase('disalytics-user-tactics');
    deleting.onsuccess = () => resolve();
    deleting.onerror = () => reject(deleting.error);
  });
}

/** A database as the version before seeding left it, holding `records`. */
function createVersionOne(records: readonly unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('disalytics-user-tactics', 1);
    opening.onupgradeneeded = () => {
      const store = opening.result.createObjectStore('tactics', { keyPath: 'id' });
      store.createIndex('map', 'map', { unique: false });
      store.createIndex('side', 'side', { unique: false });
      for (const record of records) store.put(record);
    };
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      opening.result.close();
      resolve();
    };
  });
}

async function openSeeded(): Promise<TacticStore> {
  const opened = await openTacticStore({ seed: () => [tacticC] });
  if (opened === null) throw new Error('Expected tactic store to open');
  return opened;
}

describe('TacticStore seed', () => {
  beforeEach(dropDatabase);
  afterEach(dropDatabase);

  it('plants the seed in a new database', async () => {
    const store = await openSeeded();
    expect(await store.list()).toEqual([tacticC]);
    store.close();
  });

  it('plants it once, so a deleted seed stays deleted', async () => {
    const first = await openSeeded();
    await first.delete(tacticC.id);
    first.close();

    const second = await openSeeded();
    expect(await second.list()).toEqual([]);
    second.close();
  });

  it('plants it in a database from before seeding, beside what it holds', async () => {
    await createVersionOne([tacticA]);

    const store = await openSeeded();
    expect((await store.list()).map((tactic) => tactic.id).sort()).toEqual([
      tacticA.id,
      tacticC.id,
    ]);
    store.close();
  });

  it('keeps the stored tactic when it has the seed id', async () => {
    const yours = { ...tacticC, title: 'Edited' };
    await createVersionOne([yours]);

    const store = await openSeeded();
    expect(await store.list()).toEqual([yours]);
    store.close();
  });
});
