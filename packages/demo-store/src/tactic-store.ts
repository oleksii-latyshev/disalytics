import { readTactic, type Tactic, type TacticReadOptions, type TacticSide } from '@disa/demo-core';

const DATABASE = 'disalytics-user-tactics';
const DATABASE_VERSION = 2;
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

export interface TacticStoreOptions extends TacticReadOptions {
  /**
   * The tactics every library starts with. They are written once, by the upgrade that brings a
   * database to the version that seeds — a new one or one from before it — and never again, so a
   * seeded tactic is the reader's to edit or delete. One whose id is already stored is left alone.
   */
  readonly seed?: (() => readonly Tactic[]) | undefined;
}

/** The first database version that seeds; every earlier one, `0` for none, gets the seed. */
const SEEDED_FROM = 2;

function plant(store: IDBObjectStore, tactics: readonly Tactic[]): void {
  for (const tactic of tactics) {
    const lookup = store.getKey(tactic.id);
    lookup.onsuccess = () => {
      if (lookup.result === undefined) store.put(tactic);
    };
  }
}

/**
 * `null` when IndexedDB is absent or refuses to open. Tactics of an older shape migrate as they are
 * read (`options` says how to fill what they never stored); every write stores the current shape.
 */
export async function openTacticStore(options?: TacticStoreOptions): Promise<TacticStore | null> {
  if (typeof indexedDB === 'undefined') return null;

  const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

  opening.onupgradeneeded = (event) => {
    const db = opening.result;
    let store: IDBObjectStore | undefined;
    if (db.objectStoreNames.contains(STORE)) {
      store = opening.transaction?.objectStore(STORE);
    } else {
      store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('map', 'map', { unique: false });
      store.createIndex('side', 'side', { unique: false });
    }
    if (store !== undefined && event.oldVersion < SEEDED_FROM && options?.seed !== undefined) {
      plant(store, options.seed());
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

      return items
        .map((item) => readTactic(item, options))
        .filter((tactic): tactic is Tactic => tactic !== null)
        .filter((tactic) => matchesFilter(tactic, filter));
    },

    async get(id) {
      const store = storeIn(database, 'readonly');
      const item: unknown = await settled(store.get(id));
      return readTactic(item, options);
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
