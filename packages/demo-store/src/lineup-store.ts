import type { Lineup, LineupSide, UtilityKind } from '@disa/demo-core';
import { isLineup } from '@disa/demo-core';

const DATABASE = 'disalytics-user-lineups';
const DATABASE_VERSION = 1;
const STORE = 'lineups';

function settled<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error ?? new Error('the lineup store refused a request'));
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(transaction.error ?? new Error('the lineup store abandoned a write'));

    transaction.oncomplete = () => resolve();
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

function storeIn(database: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return database.transaction(STORE, mode).objectStore(STORE);
}

export interface LineupFilter {
  readonly map?: string;
  readonly kind?: UtilityKind;
  readonly side?: LineupSide;
}

function matchesFilter(lineup: Lineup, filter: LineupFilter | undefined): boolean {
  if (filter === undefined) return true;

  if (filter.map !== undefined && lineup.map !== filter.map) {
    return false;
  }

  if (filter.kind !== undefined && lineup.kind !== filter.kind) {
    return false;
  }

  if (filter.side !== undefined && filter.side !== 'BOTH') {
    if (lineup.side !== 'BOTH' && lineup.side !== filter.side) {
      return false;
    }
  }

  return true;
}

export interface LineupStore {
  /** Returns all stored user lineups, optionally matching the given filter. */
  list(filter?: LineupFilter): Promise<readonly Lineup[]>;

  /** Retrieves a lineup by id, or null if absent. */
  get(id: string): Promise<Lineup | null>;

  /** Adds or updates a lineup. */
  put(lineup: Lineup): Promise<void>;

  /** Saves multiple lineups in a single transaction. */
  putMany(lineups: readonly Lineup[]): Promise<void>;

  /** Deletes a lineup by id. */
  delete(id: string): Promise<void>;

  /** Removes all stored user lineups. */
  clear(): Promise<void>;

  /** Closes the database connection. */
  close(): void;
}

/** `null` when IndexedDB is absent or refuses to open. */
export async function openLineupStore(): Promise<LineupStore | null> {
  if (typeof indexedDB === 'undefined') return null;

  const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

  opening.onupgradeneeded = () => {
    const db = opening.result;
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('map', 'map', { unique: false });
      store.createIndex('kind', 'kind', { unique: false });
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

      return items.filter(isLineup).filter((lineup) => matchesFilter(lineup, filter));
    },

    async get(id) {
      const store = storeIn(database, 'readonly');
      const item: unknown = await settled(store.get(id));
      return isLineup(item) ? item : null;
    },

    async put(lineup) {
      const store = storeIn(database, 'readwrite');
      store.put(lineup);
      await completed(store.transaction);
    },

    async putMany(lineups) {
      if (lineups.length === 0) return;
      const store = storeIn(database, 'readwrite');
      for (const item of lineups) {
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
