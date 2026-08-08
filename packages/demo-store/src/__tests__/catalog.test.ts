import { describe, expect, it } from 'vitest';
import {
  type CatalogEntry,
  overflowingKeys,
  parseCatalog,
  serialiseCatalog,
  staleKeys,
  totalBytes,
  withEntry,
} from '../catalog';

function entry(key: string, byteLength: number, lastUsedAt: number): CatalogEntry {
  return { key, byteLength, lastUsedAt };
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
