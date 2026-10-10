import type { Lineup, LineupCollection } from '@disa/demo-core';
import { isLineup, isLineupCollection } from '@disa/demo-core';

const DATABASE = 'disalytics-built-in-lineups';
const STORE = 'maps';

/**
 * The last built-in lineups and collections the API sent for one map. A copy stored before
 * collections existed has none; one read back always lists them, empty or not.
 */
export interface BuiltInLineups {
  readonly revision: number;
  readonly lineups: readonly Lineup[];
  readonly collections?: readonly LineupCollection[];
}

export type StoredBuiltInLineups = BuiltInLineups & {
  readonly collections: readonly LineupCollection[];
};

export interface BuiltInLineupStore {
  get(map: string): Promise<StoredBuiltInLineups | null>;
  put(map: string, copy: BuiltInLineups): Promise<void>;
  close(): void;
}

function settled<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () =>
      reject(source.error ?? new Error('the built-in store refused a request'));
  });
}

function isCopy(value: unknown): value is BuiltInLineups {
  return (
    typeof value === 'object' &&
    value !== null &&
    'revision' in value &&
    typeof value.revision === 'number' &&
    'lineups' in value &&
    Array.isArray(value.lineups)
  );
}

/** A cache, so a separate database from the user's own lineups. `null` when IndexedDB is absent. */
export async function openBuiltInLineupStore(): Promise<BuiltInLineupStore | null> {
  if (typeof indexedDB === 'undefined') return null;

  const opening = indexedDB.open(DATABASE, 1);
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore(STORE);
  };

  let database: IDBDatabase;
  try {
    database = await settled(opening);
  } catch {
    return null;
  }

  return {
    async get(map) {
      const item: unknown = await settled(
        database.transaction(STORE, 'readonly').objectStore(STORE).get(map),
      );
      if (!isCopy(item)) return null;
      const stored: readonly unknown[] = Array.isArray(item.collections) ? item.collections : [];
      return {
        revision: item.revision,
        lineups: item.lineups.filter(isLineup),
        collections: stored.filter(isLineupCollection),
      };
    },

    async put(map, copy) {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(copy, map);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    },

    close() {
      database.close();
    },
  };
}
