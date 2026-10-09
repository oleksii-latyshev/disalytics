import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { testEnv } from '../../../__tests__/support';
import { handle } from '../../../app';
import { makePhotoStorage, photoHash } from '..';

const run = Effect.runPromise;

function get(hash: string, headers: Record<string, string> = {}) {
  return new Request(`https://api.example/photos/${hash}`, { headers });
}

describe('photo storage', () => {
  it('keys bytes by their SHA-256', async () => {
    const env = testEnv();
    const hash = await run(
      makePhotoStorage(env.LINEUP_PHOTOS).save(new Uint8Array([97]), 'image/png'),
    );

    expect(hash).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
    expect(await run(photoHash(new Uint8Array([97])))).toBe(hash);
    expect(env.LINEUP_PHOTOS.entries.get(hash)?.contentType).toBe('image/png');
  });
});

describe('GET /photos/:sha256', () => {
  it('returns the bytes with their stored type and an immutable year of caching', async () => {
    const env = testEnv();
    const hash = await run(
      makePhotoStorage(env.LINEUP_PHOTOS).save(new Uint8Array([1, 2, 3]), 'image/webp'),
    );

    const response = await handle(get(hash), env, null);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it('never serves a stored non-image type as itself', async () => {
    const env = testEnv();
    const hash = await run(
      makePhotoStorage(env.LINEUP_PHOTOS).save(new Uint8Array([1]), 'text/html'),
    );

    expect((await handle(get(hash), env, null)).headers.get('Content-Type')).toBe(
      'application/octet-stream',
    );
  });

  it('is 404 for a missing photo and 304 for a matching ETag', async () => {
    const env = testEnv();
    expect((await handle(get('a'.repeat(64)), env, null)).status).toBe(404);

    const hash = await run(
      makePhotoStorage(env.LINEUP_PHOTOS).save(new Uint8Array([1]), 'image/png'),
    );
    expect((await handle(get(hash, { 'If-None-Match': `"${hash}"` }), env, null)).status).toBe(304);
  });
});
