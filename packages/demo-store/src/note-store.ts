import type { CoachNote } from '@disa/demo-core';
import { isCoachNote } from '@disa/demo-core';
import { isRecord } from './guards';

const DATABASE = 'disalytics-coach-notes';
const DATABASE_VERSION = 1;
const STORE = 'notes';
const BY_DEMO = 'demo';

function settled<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error ?? new Error('the note store refused a request'));
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(transaction.error ?? new Error('the note store abandoned a write'));

    transaction.oncomplete = () => resolve();
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

function storeIn(database: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return database.transaction(STORE, mode).objectStore(STORE);
}

export interface CoachNoteStore {
  /** The notes of one demo, by its cache key. A record that no longer decodes is simply absent. */
  list(demoKey: string): Promise<readonly CoachNote[]>;

  /** Saves a note, replacing the demo's note on that round. */
  put(demoKey: string, note: CoachNote): Promise<void>;

  /** Deletes the note on one round. */
  delete(demoKey: string, roundIndex: number): Promise<void>;

  /** Deletes every note of the given demos — what leaving the library does. */
  deleteDemos(demoKeys: readonly string[]): Promise<void>;

  close(): void;
}

/** `null` when IndexedDB is absent or refuses to open. */
export async function openCoachNoteStore(): Promise<CoachNoteStore | null> {
  if (typeof indexedDB === 'undefined') return null;

  const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

  opening.onupgradeneeded = () => {
    const db = opening.result;
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: ['demoKey', 'roundIndex'] });
      store.createIndex(BY_DEMO, 'demoKey', { unique: false });
    }
  };

  let database: IDBDatabase;
  try {
    database = await settled(opening);
  } catch {
    return null;
  }

  return {
    async list(demoKey) {
      const items: unknown[] = await settled(
        storeIn(database, 'readonly').index(BY_DEMO).getAll(demoKey),
      );

      return items.flatMap((item) => {
        if (!isRecord(item)) return [];
        const { roundIndex, frame, annotations } = item;
        const note = { roundIndex, frame, annotations };

        return isCoachNote(note) ? [note] : [];
      });
    },

    async put(demoKey, note) {
      const store = storeIn(database, 'readwrite');
      store.put({ demoKey, ...note });
      await completed(store.transaction);
    },

    async delete(demoKey, roundIndex) {
      const store = storeIn(database, 'readwrite');
      store.delete([demoKey, roundIndex]);
      await completed(store.transaction);
    },

    async deleteDemos(demoKeys) {
      if (demoKeys.length === 0) return;
      const store = storeIn(database, 'readwrite');
      for (const demoKey of demoKeys) {
        store.delete(IDBKeyRange.bound([demoKey, 0], [demoKey, Number.MAX_SAFE_INTEGER]));
      }
      await completed(store.transaction);
    },

    close() {
      database.close();
    },
  };
}

/**
 * Best effort: notes outliving their demo are clutter, and failing to clear them must never fail
 * the removal that asked.
 */
export async function forgetCoachNotes(demoKeys: readonly string[]): Promise<void> {
  try {
    const store = await openCoachNoteStore();
    if (store === null) return;

    try {
      await store.deleteDemos(demoKeys);
    } finally {
      store.close();
    }
  } catch {
    // a miss, never an error
  }
}
