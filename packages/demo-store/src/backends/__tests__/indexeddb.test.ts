import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openIndexedDbBackend } from '../indexeddb';

/**
 * `fake-indexeddb` rather than a hand-written double, decided on #75: the things that break
 * silently here are the promise wrappers around `IDBRequest` and `IDBTransaction`, the `Blob` round
 * trip and the `onupgradeneeded` store creation — all of them the platform's semantics, which a
 * double written to satisfy this code could only agree with. The dev dependency has no transitive
 * dependencies and nothing shipped imports it.
 */
const DATABASE = 'disalytics-demo-cache';
const DATABASE_VERSION = 1;
const STORE = 'demos';

/**
 * The store is emptied between tests rather than the database deleted: the backend holds its
 * connection for as long as the module lives and never exposes a `close()`, and `deleteDatabase`
 * blocks on an open connection instead of failing — which reads as a hook that hangs rather than as
 * a test that is wrong.
 *
 * It creates neither the database nor the store, deliberately. Doing either would be the fixture
 * performing the work under test: `openIndexedDbBackend` creating the object store on
 * `onupgradeneeded` is one of the things a regression would break silently, and a hook that had
 * already created it would go on passing.
 */
async function emptied(): Promise<void> {
  const existing = await indexedDB.databases();

  if (!existing.some((entry) => entry.name === DATABASE)) return;

  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

    opening.onerror = () => reject(opening.error ?? new Error('the database refused to open'));
    opening.onsuccess = () => {
      const database = opening.result;

      if (!database.objectStoreNames.contains(STORE)) {
        database.close();
        resolve();

        return;
      }

      const transaction = database.transaction(STORE, 'readwrite');

      transaction.objectStore(STORE).clear();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('the store refused to clear'));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
    };
  });
}

/** Writes a value under a key the backend itself could never produce. */
function putRaw(key: IDBValidKey, value: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

    opening.onerror = () => reject(opening.error ?? new Error('the database refused to open'));
    opening.onsuccess = () => {
      const database = opening.result;
      const transaction = database.transaction(STORE, 'readwrite');

      transaction.objectStore(STORE).put(value, key);
      transaction.onerror = () => reject(transaction.error ?? new Error('the put failed'));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
    };
  });
}

/** The names the database holds, read through a connection of the test's own. */
function storeNames(): Promise<readonly string[]> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE, DATABASE_VERSION);

    opening.onerror = () => reject(opening.error ?? new Error('the database refused to open'));
    opening.onsuccess = () => {
      const names = [...opening.result.objectStoreNames];

      opening.result.close();
      resolve(names);
    };
  });
}

/** The real factory, put back by whichever test replaced it. */
const factory = indexedDB;

async function opened() {
  const backend = await openIndexedDbBackend();

  if (backend === null) throw new Error('the backend refused to open');

  return backend;
}

beforeEach(emptied);

afterEach(() => {
  Reflect.set(globalThis, 'indexedDB', factory);
});

describe('the IndexedDB tier', () => {
  it('creates the object store on the upgrade, and says which tier it is', async () => {
    const backend = await opened();

    // Two readings of the same thing, because the store existing is what every test below assumes:
    // the names the database reports, and a write, which throws against a store that is not there.
    await backend.write('a', [Uint8Array.from([1])]);

    expect(await storeNames()).toEqual([STORE]);
    expect(backend.kind).toBe('indexeddb');
    expect(await backend.list()).toEqual(['a']);
  });

  it('gives back the bytes it was handed, joined in order', async () => {
    const backend = await opened();

    await backend.write('demo', [Uint8Array.from([1, 2, 3]), Uint8Array.from([4, 5])]);

    expect(await backend.read('demo')).toEqual(Uint8Array.from([1, 2, 3, 4, 5]));
  });

  it('reads a name it has never written as a miss rather than as a failure', async () => {
    expect(await (await opened()).read('nothing')).toBeNull();
  });

  it('overwrites a name rather than keeping both', async () => {
    const backend = await opened();

    await backend.write('demo', [Uint8Array.from([1])]);
    await backend.write('demo', [Uint8Array.from([2])]);

    expect(await backend.read('demo')).toEqual(Uint8Array.from([2]));
    expect(await backend.list()).toEqual(['demo']);
  });

  it('removes a name, and removing one that has gone is not an error', async () => {
    const backend = await opened();

    await backend.write('demo', [Uint8Array.from([1])]);
    await backend.remove('demo');
    await backend.remove('demo');

    expect(await backend.read('demo')).toBeNull();
    expect(await backend.list()).toEqual([]);
  });

  it('lists every name it holds and nothing else', async () => {
    const backend = await opened();

    await backend.write('one', [Uint8Array.from([1])]);
    await backend.write('two', [Uint8Array.from([2])]);

    expect([...(await backend.list())].sort()).toEqual(['one', 'two']);
  });

  // The store is keyed out of line, so its keys are whatever was passed — and `list()` promises
  // strings. Nothing this backend writes has another kind of key; something else sharing the
  // database is what this guard is for, and it is a claim about the return type rather than a
  // reading, so it needs a key the backend could not have written.
  it('lists only the names that are names', async () => {
    const backend = await opened();

    await backend.write('demo', [Uint8Array.from([1])]);
    await putRaw(42, new Blob([Uint8Array.from([2])]));

    expect(await backend.list()).toEqual(['demo']);
  });

  it('answers null when the browser has no IndexedDB at all', async () => {
    Reflect.deleteProperty(globalThis, 'indexedDB');

    expect(await openIndexedDbBackend()).toBeNull();
  });

  // The two wrappers around the event API have a rejection arm each, and nothing in ordinary use
  // reaches either: IndexedDB queues its transactions, so a write that never awaited completion
  // still reads back. A transaction the engine abandons is what they are for — a quota, or the
  // database going away underneath — and aborting one is the only way to produce that here.
  describe('when the engine abandons a transaction', () => {
    const begin = IDBDatabase.prototype.transaction;

    beforeEach(() => {
      IDBDatabase.prototype.transaction = function abandon(
        this: IDBDatabase,
        ...args: Parameters<IDBDatabase['transaction']>
      ) {
        const transaction = begin.apply(this, args);

        queueMicrotask(() => {
          transaction.abort();
        });

        return transaction;
      };
    });

    afterEach(() => {
      IDBDatabase.prototype.transaction = begin;
    });

    it('rejects the write rather than reporting a demo that was never stored', async () => {
      await expect((await opened()).write('demo', [Uint8Array.from([1])])).rejects.toThrow();
    });

    it('rejects the read rather than answering it as a miss', async () => {
      await expect((await opened()).read('demo')).rejects.toThrow();
    });
  });

  it('answers null when the database refuses to open, which is what private browsing does', async () => {
    const refusing = {
      open: () => {
        const request = { onerror: null, error: new DOMException('refused', 'SecurityError') } as {
          onerror: (() => void) | null;
          error: DOMException;
        };

        queueMicrotask(() => request.onerror?.());

        return request;
      },
    } as unknown as IDBFactory;

    Reflect.set(globalThis, 'indexedDB', refusing);

    expect(await openIndexedDbBackend()).toBeNull();
  });
});
