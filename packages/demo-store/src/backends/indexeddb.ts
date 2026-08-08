import type { StoreBackend } from '../backend';

const DATABASE = 'disalytics-demo-cache';
const DATABASE_VERSION = 1;
const STORE = 'demos';

function settled<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result);
    source.onerror = () => reject(source.error ?? new Error('the demo cache refused a request'));
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(transaction.error ?? new Error('the demo cache abandoned a write'));

    transaction.oncomplete = () => resolve();
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

function storeIn(database: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return database.transaction(STORE, mode).objectStore(STORE);
}

async function readValue(
  database: IDBDatabase,
  name: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const value: unknown = await settled<unknown>(storeIn(database, 'readonly').get(name));

  if (!(value instanceof Blob)) return null;

  return new Uint8Array(await value.arrayBuffer());
}

async function writeValue(
  database: IDBDatabase,
  name: string,
  chunks: readonly Uint8Array<ArrayBuffer>[],
): Promise<void> {
  const target = storeIn(database, 'readwrite');

  target.put(new Blob([...chunks]), name);

  await completed(target.transaction);
}

async function removeValue(database: IDBDatabase, name: string): Promise<void> {
  const target = storeIn(database, 'readwrite');

  target.delete(name);

  await completed(target.transaction);
}

async function listValues(database: IDBDatabase): Promise<readonly string[]> {
  const keys = await settled(storeIn(database, 'readonly').getAllKeys());

  return keys.filter((key): key is string => typeof key === 'string');
}

/** `null` when IndexedDB is absent or refuses to open, which is what private browsing does. */
export async function openIndexedDbBackend(): Promise<StoreBackend | null> {
  if (typeof indexedDB === 'undefined') return null;

  const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

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
    kind: 'indexeddb',
    read: (name) => readValue(database, name),
    write: (name, chunks) => writeValue(database, name, chunks),
    remove: (name) => removeValue(database, name),
    list: () => listValues(database),
  };
}
