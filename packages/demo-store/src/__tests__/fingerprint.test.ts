import { SCHEMA_VERSION } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { demoKeyFor, schemaVersionOf } from '../fingerprint';

const MEGABYTE = 1024 * 1024;

function newFile(bytes: Uint8Array<ArrayBuffer>, lastModified = 1_700_000_000_000): File {
  return new File([bytes], 'match.dem', { lastModified });
}

function filled(size: number, value: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(size).fill(value);
}

describe('the cache key', () => {
  it('carries the schema version the entry was written under', async () => {
    const key = await demoKeyFor(newFile(filled(64, 7)));

    expect(schemaVersionOf(key)).toBe(SCHEMA_VERSION);
  });

  it('is the same for the same file read twice', async () => {
    const bytes = filled(4096, 3);

    expect(await demoKeyFor(newFile(bytes))).toBe(await demoKeyFor(newFile(bytes)));
  });

  it('ignores the name, so a renamed demo still hits', async () => {
    const bytes = filled(4096, 3);
    const renamed = new File([bytes], 'other.dem', { lastModified: 1_700_000_000_000 });

    expect(await demoKeyFor(renamed)).toBe(await demoKeyFor(newFile(bytes)));
  });

  it('separates files of different length', async () => {
    expect(await demoKeyFor(newFile(filled(4096, 3)))).not.toBe(
      await demoKeyFor(newFile(filled(4097, 3))),
    );
  });

  it('separates files modified at different times', async () => {
    const bytes = filled(4096, 3);

    expect(await demoKeyFor(newFile(bytes, 1))).not.toBe(await demoKeyFor(newFile(bytes, 2)));
  });

  it('separates files that differ at the start', async () => {
    const one = filled(4096, 3);
    const other = filled(4096, 3);
    other[0] = 9;

    expect(await demoKeyFor(newFile(one))).not.toBe(await demoKeyFor(newFile(other)));
  });

  it('separates files that differ at the end', async () => {
    const one = filled(4096, 3);
    const other = filled(4096, 3);
    other[other.length - 1] = 9;

    expect(await demoKeyFor(newFile(one))).not.toBe(await demoKeyFor(newFile(other)));
  });

  // The trade the key makes, asserted rather than described: the digest covers a megabyte at each
  // end, so two demos of the same length, modified in the same millisecond, differing only in
  // between, collide. See the note on SAMPLE_BYTES for why that is the price paid.
  it('cannot separate files that differ only in the middle', async () => {
    const one = filled(3 * MEGABYTE, 3);
    const other = filled(3 * MEGABYTE, 3);
    other[Math.floor(other.length / 2)] = 9;

    expect(await demoKeyFor(newFile(one))).toBe(await demoKeyFor(newFile(other)));
  });
});

describe('schemaVersionOf', () => {
  it('reads nothing out of a key with no version', () => {
    expect(schemaVersionOf('abcdef')).toBeNull();
  });

  it('reads nothing out of a key whose version is not a number', () => {
    expect(schemaVersionOf('abcdef:next')).toBeNull();
  });
});
