import 'fake-indexeddb/auto';
import type { Lineup, LineupCollection } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { openBuiltInLineupStore } from '../built-in-lineup-store';

const lineup: Lineup = {
  id: 'mirage-1',
  title: 'Smoke',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 1, y: 2, z: 0 },
  landing: { x: 3, y: 4, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  isBuiltIn: true,
};

const executeB: LineupCollection = {
  id: 'exec-b',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['mirage-1'],
  createdAt: 1,
  updatedAt: 1,
  isBuiltIn: true,
};

describe('built-in lineup store', () => {
  it('keeps the last copy per map and returns null for an unseen one', async () => {
    const store = await openBuiltInLineupStore();
    if (store === null) throw new Error('fake-indexeddb should open');

    expect(await store.get('de_mirage')).toBeNull();
    await store.put('de_mirage', { revision: 4, lineups: [lineup] });
    await store.put('de_mirage', { revision: 5, lineups: [lineup, { ...lineup, id: 'two' }] });

    const copy = await store.get('de_mirage');
    expect(copy?.revision).toBe(5);
    expect(copy?.lineups.map((entry) => entry.id)).toEqual(['mirage-1', 'two']);
    expect(await store.get('de_dust2')).toBeNull();
    store.close();
  });

  it('keeps the collections with the lineups, and reads a copy stored without them as none', async () => {
    const store = await openBuiltInLineupStore();
    if (store === null) throw new Error('fake-indexeddb should open');

    await store.put('de_inferno', { revision: 1, lineups: [lineup] });
    expect((await store.get('de_inferno'))?.collections).toEqual([]);

    await store.put('de_inferno', { revision: 2, lineups: [lineup], collections: [executeB] });
    expect((await store.get('de_inferno'))?.collections).toEqual([executeB]);
    store.close();
  });
});
