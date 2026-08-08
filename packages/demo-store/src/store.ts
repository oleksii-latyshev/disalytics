import type { ParsedDemo } from '@disa/demo-core';
import { SCHEMA_VERSION } from '@disa/demo-core';
import type { BackendKind, StoreBackend } from './backend';
import { openIndexedDbBackend } from './backends/indexeddb';
import { openOpfsBackend } from './backends/opfs';
import {
  CACHE_BYTE_LIMIT,
  CATALOG_NAME,
  type CatalogEntry,
  overflowingKeys,
  parseCatalog,
  serialiseCatalog,
  staleKeys,
  withEntry,
  withoutKeys,
} from './catalog';
import { decodeDemo } from './decode';
import { byteLengthOf, encodeDemo } from './encode';
import { canFingerprint, demoKeyFor } from './fingerprint';

export interface DemoStore {
  readonly kind: BackendKind;
  /** `${fingerprint}:${SCHEMA_VERSION}` — the identity a cached demo is filed under. */
  keyFor(file: File): Promise<string>;
  read(key: string): Promise<ParsedDemo | null>;
  /** The number of bytes the demo occupies in the cache. */
  write(key: string, demo: ParsedDemo): Promise<number>;
}

function nameFor(key: string): string {
  return `${encodeURIComponent(key)}.demo`;
}

async function loadCatalog(backend: StoreBackend): Promise<CatalogEntry[]> {
  const bytes = await backend.read(CATALOG_NAME);

  return bytes === null ? [] : parseCatalog(bytes);
}

async function saveCatalog(backend: StoreBackend, entries: readonly CatalogEntry[]): Promise<void> {
  await backend.write(CATALOG_NAME, [serialiseCatalog(entries)]);
}

async function discard(
  backend: StoreBackend,
  entries: readonly CatalogEntry[],
  keys: readonly string[],
): Promise<readonly CatalogEntry[]> {
  for (const key of keys) await backend.remove(nameFor(key));

  return withoutKeys(entries, keys);
}

async function orphanKeys(
  backend: StoreBackend,
  entries: readonly CatalogEntry[],
): Promise<readonly string[]> {
  const known = new Set(entries.map((entry) => nameFor(entry.key)));
  const names = await backend.list();

  return names
    .filter((name) => name !== CATALOG_NAME && !known.has(name))
    .map((name) => decodeURIComponent(name.replace(/\.demo$/, '')));
}

async function prune(backend: StoreBackend): Promise<CatalogEntry[]> {
  const loaded = await loadCatalog(backend);
  const stale = staleKeys(loaded, SCHEMA_VERSION);
  const orphans = await orphanKeys(backend, loaded);
  const dropped = [...stale, ...orphans];

  if (dropped.length === 0) return loaded;

  const kept = await discard(backend, loaded, dropped);
  await saveCatalog(backend, kept);

  return [...kept];
}

function createStore(backend: StoreBackend, catalog: CatalogEntry[], byteLimit: number): DemoStore {
  let entries: readonly CatalogEntry[] = catalog;

  const remember = (key: string, byteLength: number) => {
    entries = withEntry(entries, { key, byteLength, lastUsedAt: Date.now() });
  };

  return {
    kind: backend.kind,
    keyFor: demoKeyFor,

    async read(key) {
      const bytes = await backend.read(nameFor(key));
      if (bytes === null) return null;

      try {
        const demo = decodeDemo(bytes);
        remember(key, bytes.byteLength);

        return demo;
      } catch {
        // Any failure to read a container back is a miss, whatever raised it: the entry is
        // unusable, and leaving it in place would cost the same read again on the next visit.
        entries = await discard(backend, entries, [key]);
        await saveCatalog(backend, entries);

        return null;
      }
    },

    async write(key, demo) {
      const chunks = encodeDemo(demo);
      const byteLength = byteLengthOf(chunks);

      await backend.write(nameFor(key), chunks);
      remember(key, byteLength);

      entries = await discard(backend, entries, overflowingKeys(entries, byteLimit, key));
      await saveCatalog(backend, entries);

      return byteLength;
    },
  };
}

export async function createDemoStore(
  backend: StoreBackend,
  byteLimit = CACHE_BYTE_LIMIT,
): Promise<DemoStore> {
  return createStore(backend, await prune(backend), byteLimit);
}

/**
 * `null` when this browser offers no tier to cache into — no OPFS, no IndexedDB, or no Web Crypto
 * to key an entry with. The caller parses every time and says so; it never fails because of it.
 */
export async function openDemoStore(): Promise<DemoStore | null> {
  if (!canFingerprint()) return null;

  const backend = (await openOpfsBackend()) ?? (await openIndexedDbBackend());

  return backend === null ? null : createDemoStore(backend);
}
