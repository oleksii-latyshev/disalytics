import 'fake-indexeddb/auto';
import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { openLineupStore } from '../lineup-store';

const lineup: Lineup = {
  id: 'old-one',
  title: 'Saved before collections',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 1, y: 2, z: 3 },
  landing: { x: 4, y: 5, z: 6 },
  pitch: -10,
  yaw: 45,
  throwType: 'stand',
  movementKeys: ['Stand'],
  movementKeysSummary: 'Stand',
  command: 'setpos 1 2 3; setang -10 45 0',
  createdAt: 1,
};

function openVersionTwo(): Promise<void> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('disalytics-user-lineups', 2);
    opening.onupgradeneeded = () => {
      const database = opening.result;
      database.createObjectStore('lineups', { keyPath: 'id' }).createIndex('map', 'map');
      database.createObjectStore('photos');
    };
    opening.onsuccess = () => {
      const database = opening.result;
      const transaction = database.transaction('lineups', 'readwrite');
      transaction.objectStore('lineups').put(lineup);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
    opening.onerror = () => reject(opening.error);
  });
}

describe('upgrading a version-2 lineup database', () => {
  it('keeps the saved lineups and gains an empty collections store', async () => {
    await openVersionTwo();

    const store = await openLineupStore();
    expect(store).not.toBeNull();
    if (store === null) return;

    expect(await store.get('old-one')).toEqual(lineup);
    expect(await store.listCollections()).toEqual([]);

    await store.putCollections([
      {
        id: 'c',
        name: 'Execute B',
        map: 'de_mirage',
        lineupIds: ['old-one'],
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    expect(await store.listCollections('de_mirage')).toHaveLength(1);
    store.close();
  });
});
