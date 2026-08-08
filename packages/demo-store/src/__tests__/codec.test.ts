import { describe, expect, it } from 'vitest';
import { CONTAINER_MAGIC, CorruptCacheError, PREFIX_BYTES } from '../container';
import { decodeDemo } from '../decode';
import { byteLengthOf, encodeDemo } from '../encode';
import { newDemo } from './fixture';

function join(chunks: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(byteLengthOf(chunks));
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

function encoded(): Uint8Array<ArrayBuffer> {
  return join(encodeDemo(newDemo()));
}

describe('the cache container', () => {
  it('gives back the demo it was handed', () => {
    expect(decodeDemo(encoded())).toEqual(newDemo());
  });

  it('writes the same bytes for the same demo', () => {
    expect(encoded()).toEqual(encoded());
  });

  it('re-encodes what it decoded to the same bytes', () => {
    const once = encoded();

    expect(join(encodeDemo(decodeDemo(once)))).toEqual(once);
  });

  it('starts with the magic that names it', () => {
    const bytes = encoded();

    expect(new DataView(bytes.buffer).getUint32(0, true)).toBe(CONTAINER_MAGIC);
  });

  it('refuses bytes that are not a container', () => {
    expect(() => decodeDemo(new Uint8Array(64))).toThrow(CorruptCacheError);
  });

  it('refuses a container shorter than its own prefix', () => {
    expect(() => decodeDemo(encoded().slice(0, PREFIX_BYTES - 1))).toThrow(CorruptCacheError);
  });

  it('refuses a container cut off before its payload', () => {
    const bytes = encoded();

    expect(() => decodeDemo(bytes.slice(0, PREFIX_BYTES + 4))).toThrow(CorruptCacheError);
  });

  it('refuses a container whose payload was truncated', () => {
    const bytes = encoded();

    expect(() => decodeDemo(bytes.slice(0, bytes.byteLength - 8))).toThrow(CorruptCacheError);
  });
});
