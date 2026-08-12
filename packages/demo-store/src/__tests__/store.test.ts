import { SCHEMA_VERSION } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { CATALOG_NAME, type CatalogEntry, parseCatalog, serialiseCatalog } from '../catalog';
import { createDemoStore } from '../store';
import { type FakeBackend, newBackend, newDemo } from './fixture';

const KEY = `abc:${SCHEMA_VERSION}`;
const OTHER_KEY = `def:${SCHEMA_VERSION}`;

function nameFor(key: string): string {
  return `${encodeURIComponent(key)}.demo`;
}

function catalogOf(backend: FakeBackend): CatalogEntry[] {
  const bytes = backend.files.get(CATALOG_NAME);

  return bytes === undefined ? [] : parseCatalog(bytes);
}

describe('the demo store', () => {
  it('reads nothing for a key it has never seen', async () => {
    const store = await createDemoStore(newBackend());

    expect(await store.read(KEY)).toBeNull();
  });

  it('gives back the demo it was handed', async () => {
    const store = await createDemoStore(newBackend());
    await store.write(KEY, newDemo(), 'match.dem');

    expect(await store.read(KEY)).toEqual(newDemo());
  });

  it('records what the entry costs', async () => {
    const backend = newBackend();
    const store = await createDemoStore(backend);
    const byteLength = await store.write(KEY, newDemo(), 'match.dem');
    const entries = catalogOf(backend);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.key).toBe(KEY);
    expect(entries[0]?.byteLength).toBe(byteLength);
  });

  it('reads a damaged entry as a miss and stops keeping it', async () => {
    const backend = newBackend();
    const store = await createDemoStore(backend);
    await store.write(KEY, newDemo(), 'match.dem');
    backend.files.set(nameFor(KEY), new Uint8Array(32));

    expect(await store.read(KEY)).toBeNull();
    expect(backend.files.has(nameFor(KEY))).toBe(false);
    expect(catalogOf(backend)).toEqual([]);
  });

  it('evicts the older entry when the newer one does not fit beside it', async () => {
    const backend = newBackend();
    const store = await createDemoStore(backend, 1024);

    await store.write(KEY, newDemo(), 'match.dem');
    await store.write(OTHER_KEY, newDemo(), 'other.dem');

    expect(backend.files.has(nameFor(KEY))).toBe(false);
    expect(backend.files.has(nameFor(OTHER_KEY))).toBe(true);
    expect(catalogOf(backend).map((entry) => entry.key)).toEqual([OTHER_KEY]);
  });

  it('drops an entry written under another schema version on open', async () => {
    const stale = `abc:${SCHEMA_VERSION - 1}`;
    const backend = newBackend(
      new Map([
        [nameFor(stale), new Uint8Array(8)],
        [CATALOG_NAME, serialiseCatalog([{ key: stale, byteLength: 8, lastUsedAt: 1 }])],
      ]),
    );

    await createDemoStore(backend);

    expect(backend.files.has(nameFor(stale))).toBe(false);
    expect(catalogOf(backend)).toEqual([]);
  });

  it('drops a file the catalog never recorded on open', async () => {
    const backend = newBackend(new Map([[nameFor(KEY), new Uint8Array(8)]]));

    await createDemoStore(backend);

    expect(backend.files.has(nameFor(KEY))).toBe(false);
  });

  it('names what it stored, so the entry can be listed rather than only evicted', async () => {
    const backend = newBackend();
    const store = await createDemoStore(backend);
    await store.write(KEY, newDemo(), 'match.dem');

    expect(store.list()).toEqual([
      expect.objectContaining({
        key: KEY,
        fileName: 'match.dem',
        map: 'de_mirage',
        roundCount: 1,
        score: { startedCt: 1, startedT: 0 },
      }),
    ]);
    expect(catalogOf(backend)[0]?.meta?.fileName).toBe('match.dem');
  });

  it('lists the most recently used first', async () => {
    const store = await createDemoStore(newBackend());
    await store.write(KEY, newDemo(), 'first.dem');
    await store.write(OTHER_KEY, newDemo(), 'second.dem');
    await store.read(KEY);

    expect(store.list().map((demo) => demo.key)).toEqual([KEY, OTHER_KEY]);
  });

  it('does not forget the name when a read moves an entry to the front', async () => {
    const store = await createDemoStore(newBackend());
    await store.write(KEY, newDemo(), 'match.dem');
    await store.read(KEY);

    expect(store.list()[0]?.fileName).toBe('match.dem');
  });

  it('does not list an entry written before the metadata existed', async () => {
    const backend = newBackend(
      new Map([
        [nameFor(KEY), new Uint8Array(8)],
        [CATALOG_NAME, serialiseCatalog([{ key: KEY, byteLength: 8, lastUsedAt: 1 }])],
      ]),
    );
    const store = await createDemoStore(backend);

    expect(catalogOf(backend).map((entry) => entry.key)).toEqual([KEY]);
    expect(store.list()).toEqual([]);
  });

  it('removes an entry and the file it named', async () => {
    const backend = newBackend();
    const store = await createDemoStore(backend);
    await store.write(KEY, newDemo(), 'match.dem');

    await store.remove(KEY);

    expect(store.list()).toEqual([]);
    expect(backend.files.has(nameFor(KEY))).toBe(false);
    expect(catalogOf(backend)).toEqual([]);
    expect(await store.read(KEY)).toBeNull();
  });

  it('leaves an intact cache alone on open', async () => {
    const backend = newBackend();
    await (await createDemoStore(backend)).write(KEY, newDemo(), 'match.dem');
    const writes = backend.writes;

    await createDemoStore(backend);

    expect(backend.writes).toBe(writes);
    expect(backend.files.has(nameFor(KEY))).toBe(true);
  });
});
