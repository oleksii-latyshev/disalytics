import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { inflateSample, isGzip } from '../helpers/inflate';

const container = new Uint8Array(new TextEncoder().encode('DISA container bytes'));

describe('inflateSample', () => {
  it('inflates a body that is still gzip', async () => {
    const compressed = new Uint8Array(gzipSync(container));

    expect(isGzip(compressed)).toBe(true);
    expect(await inflateSample(compressed)).toEqual(container);
  });

  it('passes through a body the browser already inflated', async () => {
    expect(isGzip(container)).toBe(false);
    expect(await inflateSample(container)).toBe(container);
  });

  it('treats a body too short for the magic as already inflated', async () => {
    const one = new Uint8Array([0x1f]);

    expect(await inflateSample(one)).toBe(one);
  });
});
