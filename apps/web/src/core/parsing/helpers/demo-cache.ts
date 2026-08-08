import type { ParsedDemo } from '@disa/demo-core';
import {
  type DemoStore,
  openDemoStore,
  type PersistenceStatus,
  requestPersistence,
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

  return {
    read: () => store.read(key).catch(() => null),
    write: async (demo) => {
      await store.write(key, demo);

      return requestPersistence();
    },
  };
}
