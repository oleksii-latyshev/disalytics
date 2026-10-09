import 'fake-indexeddb/auto';
import type { LineupCollection } from '@disa/demo-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type LineupStore, openLineupStore } from '../lineup-store';

const executeB: LineupCollection = {
  id: 'c1',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['mirage-b-smoke', 'mirage-b-flash'],
  createdAt: 10,
  updatedAt: 20,
};
const retakeB: LineupCollection = { ...executeB, id: 'c2', name: 'Retake B', lineupIds: [] };
const dust: LineupCollection = { ...executeB, id: 'c3', name: 'Long', map: 'de_dust2' };

describe('lineup collections (IndexedDB)', () => {
  let store: LineupStore;

  beforeEach(async () => {
    const opened = await openLineupStore();
    if (opened === null) throw new Error('Expected lineup store to open');
    store = opened;
    for (const collection of await store.listCollections()) {
      await store.deleteCollection(collection.id);
    }
  });

  afterEach(() => store.close());

  it('round-trips collections, built-in ids and all', async () => {
    await store.putCollections([executeB, retakeB]);
    const listed = await store.listCollections();

    expect(listed).toHaveLength(2);
    expect(listed).toContainEqual(executeB);
  });

  it('lists a map own collections only', async () => {
    await store.putCollections([executeB, retakeB, dust]);

    expect((await store.listCollections('de_mirage')).map((c) => c.id).sort()).toEqual([
      'c1',
      'c2',
    ]);
    expect((await store.listCollections('de_dust2')).map((c) => c.id)).toEqual(['c3']);
    expect(await store.listCollections('de_nuke')).toEqual([]);
  });

  it('replaces by id and deletes', async () => {
    await store.putCollections([executeB]);
    await store.putCollections([{ ...executeB, name: 'Renamed', updatedAt: 30 }]);
    expect((await store.listCollections()).map((c) => c.name)).toEqual(['Renamed']);

    await store.deleteCollection('c1');
    expect(await store.listCollections()).toEqual([]);
  });

  it('is not touched by lineup writes or clear()', async () => {
    await store.putCollections([executeB]);
    await store.clear();

    expect(await store.listCollections()).toHaveLength(1);
  });
});
