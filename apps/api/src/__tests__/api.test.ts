import { describe, expect, it } from 'vitest';
import { handle } from '../app';
import { fakeCache, testEnv } from './support';

function get(path: string, headers: Record<string, string> = {}, method = 'GET') {
  return new Request(`https://api.example${path}`, { method, headers });
}

describe('routing and CORS', () => {
  it('answers GET /health uncached', async () => {
    const response = await handle(get('/health'), testEnv(), null);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('answers 404 not_found for unknown routes, wrong methods and malformed ids', async () => {
    const env = testEnv();
    const probes: [string, string][] = [
      ['GET', '/other'],
      ['GET', '/lineups/de_mirage/extra'],
      ['GET', '/photos/'],
      ['POST', '/health'],
      ['GET', '/lineups/Mirage'],
      ['GET', '/lineups/de_'],
      ['GET', `/photos/${'A'.repeat(64)}`],
      ['GET', `/photos/${'a'.repeat(63)}`],
    ];
    for (const [method, path] of probes) {
      const response = await handle(get(path, {}, method), env, null);

      expect(response.status, `${method} ${path}`).toBe(404);
      expect(await response.json()).toEqual({ error: 'not_found' });
    }
  });

  it('allows the web origin and localhost dev origins, and no others', async () => {
    const env = testEnv();
    const allow = async (origin: string) =>
      (await handle(get('/lineups/de_mirage', { Origin: origin }), env, null)).headers.get(
        'Access-Control-Allow-Origin',
      );

    expect(await allow('https://disalytics.disa-67b.workers.dev')).toBe(
      'https://disalytics.disa-67b.workers.dev',
    );
    expect(await allow('http://localhost:5173')).toBe('http://localhost:5173');
    expect(await allow('https://evil.example')).toBeNull();
  });

  it('serves a cached lineups response without reading the database again', async () => {
    const env = testEnv();
    const cache = fakeCache();
    await handle(get('/lineups/de_mirage'), env, cache);
    expect(cache.entries.size).toBe(1);

    const failing = {
      ...env,
      LINEUPS_DB: {
        prepare: () => Promise.reject(new Error('down')),
        batch: () => Promise.reject(new Error('down')),
      },
    };
    const second = await handle(
      get('/lineups/de_mirage', { Origin: 'http://localhost:5173' }),
      failing,
      cache,
    );

    expect(second.status).toBe(200);
    expect(second.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});
