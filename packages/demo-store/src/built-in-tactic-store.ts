import { isTactic, type Tactic } from '@disa/demo-core';

const DATABASE = 'disalytics-built-in-tactics';
const STORE = 'copy';
const KEY = 'all';

/** The last built-in tactics the API sent, for every map at once, and the revision they came with. */
export interface BuiltInTactics {
  readonly revision: number;
  readonly tactics: readonly Tactic[];
}

export interface BuiltInTacticStore {
  get(): Promise<BuiltInTactics | null>;
  put(copy: BuiltInTactics): Promise<void>;
  close(): void;
}

function settled<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () =>
      reject(source.error ?? new Error('the built-in tactic store refused a request'));
  });
}

function isCopy(value: unknown): value is { revision: number; tactics: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'revision' in value &&
    typeof value.revision === 'number' &&
    'tactics' in value &&
    Array.isArray(value.tactics)
  );
}

/** A cache, so a separate database from the user's own tactics. `null` when IndexedDB is absent. */
export async function openBuiltInTacticStore(): Promise<BuiltInTacticStore | null> {
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
    async get() {
      const item: unknown = await settled(
        database.transaction(STORE, 'readonly').objectStore(STORE).get(KEY),
      );
      if (!isCopy(item)) return null;
      return { revision: item.revision, tactics: item.tactics.filter(isTactic) };
    },

    async put(copy) {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(copy, KEY);
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
