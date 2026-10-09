import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { env, fakeCache, fakeD1, fakeKv, noWait } from '../../../__tests__/fakes';
import { deleteLineup, readMapLineups, routeLineups, saveLineup } from '..';

const lineup: Lineup = {
  id: 'mirage-1',
  title: 'Smoke window',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 1, y: 2, z: 0 },
  landing: { x: 3, y: 4, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
};

function row(body: unknown, id = 'mirage-1', deleted = false) {
  return {
    id,
    map: 'de_mirage',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    deleted,
  };
}

function context(db = fakeD1([row(lineup)], { de_mirage: 3 }), cache = fakeCache()) {
  return { env: env(db, fakeKv({})), ctx: noWait, cache, db };
}

function get(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://api.example${path}`, { headers });
}

describe('readMapLineups', () => {
  it('returns valid live lineups as built-ins with the map revision', async () => {
    const db = fakeD1(
      [row(lineup), row('not json', 'a'), row({ id: 'b' }, 'b'), row(lineup, 'gone', true)],
      { de_mirage: 7 },
    );

    expect(await readMapLineups(db, 'de_mirage')).toEqual({
      map: 'de_mirage',
      revision: 7,
      lineups: [{ ...lineup, isBuiltIn: true }],
    });
  });

  it('has revision 0 for a map nobody wrote to', async () => {
    expect((await readMapLineups(fakeD1([], {}), 'de_dust2')).revision).toBe(0);
  });
});

describe('GET /lineups/:map', () => {
  it('answers with the lineups, an ETag on the revision and CORS for the web origin', async () => {
    const response = await routeLineups(
      get('/lineups/de_mirage', { Origin: 'https://disalytics.disa-67b.workers.dev' }),
      'de_mirage',
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe('"de_mirage-3"');
    expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://disalytics.disa-67b.workers.dev',
    );
    expect(await response.json()).toEqual({
      map: 'de_mirage',
      revision: 3,
      lineups: [{ ...lineup, isBuiltIn: true }],
    });
  });

  it('allows localhost dev origins and no others', async () => {
    const allowed = await routeLineups(
      get('/lineups/de_mirage', { Origin: 'http://localhost:5173' }),
      'de_mirage',
      context(),
    );
    const refused = await routeLineups(
      get('/lineups/de_mirage', { Origin: 'https://evil.example' }),
      'de_mirage',
      context(),
    );

    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(refused.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers 304 when the ETag matches', async () => {
    const response = await routeLineups(
      get('/lineups/de_mirage', { 'If-None-Match': '"de_mirage-3"' }),
      'de_mirage',
      context(),
    );

    expect(response.status).toBe(304);
    expect(await response.text()).toBe('');
  });

  it('serves the second request from the cache without touching D1', async () => {
    const shared = context();
    await routeLineups(get('/lineups/de_mirage'), 'de_mirage', shared);
    const readsAfterFirst = shared.db.reads;
    const second = await routeLineups(get('/lineups/de_mirage'), 'de_mirage', shared);

    expect(second.status).toBe(200);
    expect(shared.db.reads).toBe(readsAfterFirst);
  });

  it('refuses a malformed map id and a non-GET method', async () => {
    for (const map of ['Mirage', 'de_', '..', 'de_mirage;drop']) {
      expect((await routeLineups(get(`/lineups/${map}`), map, context())).status).toBe(404);
    }
    const post = await routeLineups(
      new Request('https://api.example/lineups/de_mirage', { method: 'POST' }),
      'de_mirage',
      context(),
    );
    expect(post.status).toBe(405);
  });
});

describe('writes for the admin Worker', () => {
  it('saves a lineup, bumps the map revision and logs the change in one batch', async () => {
    const db = fakeD1([], {});
    await saveLineup(db, { lineup: { ...lineup, isBuiltIn: true }, actor: 'a@b.c', now: 5 });

    expect(db.batches).toHaveLength(1);
    const [upsert, bump, log] = db.batches[0] ?? [];
    expect(upsert?.sql).toContain('INSERT INTO lineups');
    expect(JSON.parse(String(upsert?.values[2]))).not.toHaveProperty('isBuiltIn');
    expect(bump?.values).toEqual(['de_mirage']);
    expect(log?.values.slice(0, 5)).toEqual(['mirage-1', 'de_mirage', 'save', 'a@b.c', 5]);
  });

  it('soft-deletes a live lineup and reports a missing one', async () => {
    const db = fakeD1([row(lineup)], {});

    expect(await deleteLineup(db, { id: 'mirage-1', actor: 'a@b.c', now: 9 })).toBe(true);
    expect(db.batches[0]?.[0]?.sql).toContain('UPDATE lineups SET deleted_at');
    expect(await deleteLineup(db, { id: 'nope', actor: 'a@b.c', now: 9 })).toBe(false);
    expect(db.batches).toHaveLength(1);
  });
});
