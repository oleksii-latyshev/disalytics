import type { Lineup } from '@disa/demo-core';
import { isLineup } from '@disa/demo-core';

const DATABASE = 'disalytics-built-in-lineups';
const STORE = 'maps';

/** The last built-in lineups the API sent for one map. */
export interface BuiltInLineups {
  readonly revision: number;
  readonly lineups: readonly Lineup[];
}

export interface BuiltInLineupStore {
  get(map: string): Promise<BuiltInLineups | null>;
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
      return { revision: item.revision, lineups: item.lineups.filter(isLineup) };
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
