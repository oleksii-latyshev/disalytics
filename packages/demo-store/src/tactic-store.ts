import type { Tactic, TacticSide } from '@disa/demo-core';
import { isTactic } from '@disa/demo-core';

const DATABASE = 'disalytics-user-tactics';
const DATABASE_VERSION = 1;
const STORE = 'tactics';

function settled<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error ?? new Error('the tactic store refused a request'));
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(transaction.error ?? new Error('the tactic store abandoned a write'));

    transaction.oncomplete = () => resolve();
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

function storeIn(database: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return database.transaction(STORE, mode).objectStore(STORE);
}

export interface TacticFilter {
  readonly map?: string | undefined;
  readonly side?: TacticSide | undefined;
}

function matchesFilter(tactic: Tactic, filter: TacticFilter | undefined): boolean {
  if (filter === undefined) return true;

  if (filter.map !== undefined && tactic.map !== filter.map) {
    return false;
  }

  if (filter.side !== undefined && tactic.side !== filter.side) {
    return false;
  }

  return true;
}

export interface TacticStore {
  /** Returns all stored user tactics, optionally matching the given filter. */
  list(filter?: TacticFilter | undefined): Promise<readonly Tactic[]>;

  /** Retrieves a tactic by id, or null if absent. */
  get(id: string): Promise<Tactic | null>;

  /** Adds or updates a tactic. */
  put(tactic: Tactic): Promise<void>;

  /** Saves multiple tactics in a single transaction. */
  putMany(tactics: readonly Tactic[]): Promise<void>;

  /** Deletes a tactic by id. */
  delete(id: string): Promise<void>;

  /** Removes all stored user tactics. */
  clear(): Promise<void>;

  /** Closes the database connection. */
  close(): void;
}

/** `null` when IndexedDB is absent or refuses to open. */
export async function openTacticStore(): Promise<TacticStore | null> {
  if (typeof indexedDB === 'undefined') return null;

  const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

  opening.onupgradeneeded = () => {
    const db = opening.result;
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('map', 'map', { unique: false });
      store.createIndex('side', 'side', { unique: false });
    }
  };

  let database: IDBDatabase;
  try {
    database = await settled(opening);
  } catch {
    return null;
  }

  return {
    async list(filter) {
      const store = storeIn(database, 'readonly');
      let items: unknown[];

      if (filter?.map !== undefined) {
        const index = store.index('map');
        items = await settled(index.getAll(filter.map));
      } else {
        items = await settled(store.getAll());
      }

      return items.filter(isTactic).filter((tactic) => matchesFilter(tactic, filter));
    },

    async get(id) {
      const store = storeIn(database, 'readonly');
      const item: unknown = await settled(store.get(id));
      return isTactic(item) ? item : null;
    },

    async put(tactic) {
      const store = storeIn(database, 'readwrite');
      store.put(tactic);
      await completed(store.transaction);
    },

    async putMany(tactics) {
      if (tactics.length === 0) return;
      const store = storeIn(database, 'readwrite');
      for (const item of tactics) {
        store.put(item);
      }
      await completed(store.transaction);
    },

    async delete(id) {
      const store = storeIn(database, 'readwrite');
      store.delete(id);
      await completed(store.transaction);
    },

    async clear() {
      const store = storeIn(database, 'readwrite');
      store.clear();
      await completed(store.transaction);
    },

    close() {
      database.close();
    },
  };
}
