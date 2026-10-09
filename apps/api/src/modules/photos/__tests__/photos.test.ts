import { describe, expect, it } from 'vitest';
import { env, fakeCache, fakeD1, fakeKv, noWait } from '../../../__tests__/fakes';
import { routePhotos, savePhoto } from '..';

const HASH = 'a'.repeat(64);

function context(entries: Parameters<typeof fakeKv>[0]) {
  return { env: env(fakeD1([], {}), fakeKv(entries)), ctx: noWait, cache: fakeCache() };
}

function get(hash: string, headers: Record<string, string> = {}) {
  return new Request(`https://api.example/photos/${hash}`, { headers });
}

describe('GET /photos/:sha256', () => {
  it('returns the bytes with their stored type and an immutable year of caching', async () => {
    const response = await routePhotos(
      get(HASH),
      HASH,
      context({ [HASH]: { bytes: [1, 2, 3], contentType: 'image/webp' } }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it('never serves a stored non-image type as itself', async () => {
    const response = await routePhotos(
      get(HASH),
      HASH,
      context({ [HASH]: { bytes: [1], contentType: 'text/html' } }),
    );

    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
  });

  it('is 404 for a missing photo and for anything but lowercase hex-64', async () => {
    expect((await routePhotos(get(HASH), HASH, context({}))).status).toBe(404);
    for (const bad of ['abc', 'A'.repeat(64), `${'a'.repeat(63)}g`, `${HASH}0`]) {
      const response = await routePhotos(get(bad), bad, context({ [bad]: { bytes: [1] } }));
      expect(response.status).toBe(404);
    }
  });

  it('answers 304 to a matching ETag', async () => {
    const response = await routePhotos(
      get(HASH, { 'If-None-Match': `"${HASH}"` }),
      HASH,
      context({ [HASH]: { bytes: [1], contentType: 'image/png' } }),
    );

    expect(response.status).toBe(304);
  });
});

describe('savePhoto', () => {
  it('keys the bytes by their SHA-256', async () => {
    const entries: Parameters<typeof fakeKv>[0] = {};
    const hash = await savePhoto(fakeKv(entries), new Uint8Array([97]).buffer, 'image/png');

    expect(hash).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
    expect(entries[hash]?.contentType).toBe('image/png');
  });
});
