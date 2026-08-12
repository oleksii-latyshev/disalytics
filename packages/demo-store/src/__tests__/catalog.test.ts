import { describe, expect, it } from 'vitest';
import {
  type CatalogEntry,
  type CatalogMeta,
  overflowingKeys,
  parseCatalog,
  savedDemos,
  serialiseCatalog,
  staleKeys,
  totalBytes,
  withEntry,
  withUse,
} from '../catalog';

function entry(key: string, byteLength: number, lastUsedAt: number): CatalogEntry {
  return { key, byteLength, lastUsedAt };
}

function meta(overrides: Partial<CatalogMeta> = {}): CatalogMeta {
  return {
    fileName: 'match.dem',
    map: 'de_mirage',
    roundCount: 24,
    score: { startedCt: 13, startedT: 11 },
    storedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function named(
  key: string,
  lastUsedAt: number,
  overrides: Partial<CatalogMeta> = {},
): CatalogEntry {
  return { ...entry(key, 10, lastUsedAt), meta: meta(overrides) };
}

describe('eviction', () => {
  it('drops nothing while the cache fits', () => {
    const entries = [entry('a:2', 10, 1), entry('b:2', 10, 2)];

    expect(overflowingKeys(entries, 100, 'b:2')).toEqual([]);
  });

  it('drops the least recently used first', () => {
    const entries = [entry('old:2', 10, 1), entry('newer:2', 10, 5), entry('fresh:2', 10, 9)];

    expect(overflowingKeys(entries, 20, 'fresh:2')).toEqual(['old:2']);
  });

  it('keeps dropping until the cache fits', () => {
    const entries = [entry('a:2', 10, 1), entry('b:2', 10, 2), entry('c:2', 10, 9)];

    expect(overflowingKeys(entries, 10, 'c:2')).toEqual(['a:2', 'b:2']);
  });

  it('never drops the entry just written, even when it alone is over the limit', () => {
    const entries = [entry('huge:2', 500, 9)];

    expect(overflowingKeys(entries, 10, 'huge:2')).toEqual([]);
  });

  it('orders entries used in the same millisecond by key', () => {
    const entries = [entry('b:2', 10, 1), entry('a:2', 10, 1), entry('c:2', 10, 9)];

    expect(overflowingKeys(entries, 10, 'c:2')).toEqual(['a:2', 'b:2']);
  });
});

describe('the catalog', () => {
  it('replaces an entry rather than repeating its key', () => {
    const entries = withEntry([entry('a:2', 10, 1)], entry('a:2', 40, 5));

    expect(entries).toEqual([entry('a:2', 40, 5)]);
    expect(totalBytes(entries)).toBe(40);
  });

  it('names entries written under another schema version', () => {
    const entries = [entry('a:1', 10, 1), entry('b:2', 10, 2), entry('c', 10, 3)];

    expect(staleKeys(entries, 2)).toEqual(['a:1', 'c']);
  });

  it('survives being written and read back', () => {
    const entries = [entry('a:2', 10, 1)];

    expect(parseCatalog(serialiseCatalog(entries))).toEqual(entries);
  });

  it('reads as empty when the bytes are not a catalog', () => {
    expect(parseCatalog(new TextEncoder().encode('not json'))).toEqual([]);
  });

  it('drops entries that are not shaped like one', () => {
    const bytes = new TextEncoder().encode(
      '[{"key":"a:2"},{"key":"b:2","byteLength":1,"lastUsedAt":2}]',
    );

    expect(parseCatalog(bytes)).toEqual([entry('b:2', 1, 2)]);
  });
});

describe('catalog metadata', () => {
  it('survives being written and read back', () => {
    const entries = [named('a:2', 1)];

    expect(parseCatalog(serialiseCatalog(entries))).toEqual(entries);
  });

  it('reads an entry written before the metadata existed as one without it', () => {
    const bytes = new TextEncoder().encode('[{"key":"a:2","byteLength":1,"lastUsedAt":2}]');

    expect(parseCatalog(bytes)).toEqual([entry('a:2', 1, 2)]);
  });

  it('keeps the entry when its metadata is malformed, and only loses the name', () => {
    const bytes = new TextEncoder().encode(
      '[{"key":"a:2","byteLength":1,"lastUsedAt":2,"meta":{"map":"de_mirage"}}]',
    );

    expect(parseCatalog(bytes)).toEqual([entry('a:2', 1, 2)]);
  });

  it('keeps the name when a read moves an entry to the front', () => {
    const entries = withUse([named('a:2', 1)], { key: 'a:2', byteLength: 20, lastUsedAt: 9 });

    expect(entries).toEqual([{ ...entry('a:2', 20, 9), meta: meta() }]);
  });

  it('lists only what can be named, most recently used first', () => {
    const entries = [entry('nameless:2', 10, 9), named('a:2', 1), named('b:2', 5)];

    expect(savedDemos(entries).map((demo) => demo.key)).toEqual(['b:2', 'a:2']);
  });

  it('flattens an entry into what a row reads', () => {
    expect(savedDemos([named('a:2', 5, { fileName: 'faceit.dem' })])).toEqual([
      { key: 'a:2', byteLength: 10, lastUsedAt: 5, ...meta({ fileName: 'faceit.dem' }) },
    ]);
  });
});
