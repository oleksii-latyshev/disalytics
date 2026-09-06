import type { ParsedDemo } from '@disa/demo-core';
import {
  type DemoStore,
  openDemoStore,
  type PersistenceStatus,
  requestPersistence,
  type SavedDemo,
} from '@disa/demo-store';

let opening: Promise<DemoStore | null> | null = null;

function sharedStore(): Promise<DemoStore | null> {
  opening ??= openDemoStore().catch(() => null);

  return opening;
}

export interface DemoCache {
  read(): Promise<ParsedDemo | null>;
  /** Rejects when the demo could not be stored; the reader is told, and keeps the demo it has. */
  write(demo: ParsedDemo): Promise<PersistenceStatus>;
}

function cacheAt(store: DemoStore, key: string, fileName: string): DemoCache {
  return {
    read: () => store.read(key).catch(() => null),
    write: async (demo) => {
      await store.write(key, demo, fileName);

      return requestPersistence();
    },
  };
}

/**
 * `null` when this browser has nothing to cache into, or when reaching the cache failed. The cost
 * of either is a parse rather than a demo, so neither is worth failing the open over.
 */
export async function openCacheFor(file: File): Promise<DemoCache | null> {
  const store = await sharedStore();
  if (store === null) return null;

  let key: string;

  try {
    key = await store.keyFor(file);
  } catch {
    return null;
  }

  return cacheAt(store, key, file.name);
}

/**
 * The same cache under a key the caller already knows, which is how a sample match is filed: there
 * is no file to fingerprint, and the id in the key is what makes the entry recognisable in a
 * catalogue full of hashes. A `null` here costs the download again on the next visit and nothing
 * else, exactly as a missing cache costs a parse again.
 */
export async function openCacheAt(key: string, fileName: string): Promise<DemoCache | null> {
  const store = await sharedStore();

  return store === null ? null : cacheAt(store, key, fileName);
}

/**
 * What this device holds, named. Empty when there is nothing to cache into: a browser with no tier
 * has no list rather than an error, the same answer `openCacheFor` gives.
 */
export async function listSavedDemos(): Promise<readonly SavedDemo[]> {
  const store = await sharedStore();

  return store?.list() ?? [];
}

/** `null` when the entry has gone since it was listed — evicted here, or cleared by the browser. */
export async function readSavedDemo(key: string): Promise<ParsedDemo | null> {
  const store = await sharedStore();
  if (store === null) return null;

  return store.read(key).catch(() => null);
}

export async function forgetSavedDemo(key: string): Promise<void> {
  const store = await sharedStore();

  await store?.remove(key);
}
