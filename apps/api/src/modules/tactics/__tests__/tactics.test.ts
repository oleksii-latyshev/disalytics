import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../../__tests__/sqlite-d1';
import { fakeCache, testEnv } from '../../../__tests__/support';
import { tactic } from '../../../__tests__/tactics-fixture';
import { handle } from '../../../app';
import { makeTacticStorage } from '..';

const run = Effect.runPromise;

describe.skipIf(!hasSqlite)('tactic storage over real SQLite', () => {
  it('saves many tactics with one revision bump and reads them back oldest first', async () => {
    const storage = makeTacticStorage(testEnv().LINEUPS_DB);
    expect(await run(storage.read)).toEqual({ revision: 0, tactics: [] });

    await run(
      storage.save({
        tactics: [tactic({ id: 'a' }), tactic({ id: 'b', map: 'de_dust2' })],
        actor: 'x',
        now: 5,
      }),
    );
    const site = await run(storage.read);

    expect(site.revision).toBe(1);
    expect(site.tactics.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('replaces a tactic, soft-deletes it and reports a missing one', async () => {
    const storage = makeTacticStorage(testEnv().LINEUPS_DB);
    await run(storage.save({ tactics: [tactic()], actor: 'x', now: 1 }));
    await run(storage.save({ tactics: [tactic({ title: 'Renamed' })], actor: 'x', now: 2 }));
    expect((await run(storage.read)).tactics.map(({ title }) => title)).toEqual(['Renamed']);

    expect(await run(storage.remove({ id: 'mirage-b-split', actor: 'x', now: 3 }))).toBe(true);
    expect(await run(storage.remove({ id: 'mirage-b-split', actor: 'x', now: 4 }))).toBe(false);
    expect(await run(storage.read)).toEqual({ revision: 3, tactics: [] });
  });
});

describe.skipIf(!hasSqlite)('GET /tactics', () => {
  it('answers with every live tactic, an ETag on the revision and the cache policy', async () => {
    const env = testEnv();
    await run(makeTacticStorage(env.LINEUPS_DB).save({ tactics: [tactic()], actor: 'a', now: 1 }));

    const response = await handle(new Request('https://api.example/tactics'), env, null);

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe('"tactics-1"');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=600',
    );
    expect(await response.json()).toEqual({ revision: 1, tactics: [tactic()] });
  });

  it('answers revision 0 when nothing is seeded, and 304 on a matching ETag', async () => {
    const env = testEnv();
    const empty = await handle(new Request('https://api.example/tactics'), env, null);
    expect(await empty.json()).toEqual({ revision: 0, tactics: [] });

    const matched = await handle(
      new Request('https://api.example/tactics', { headers: { 'If-None-Match': '"tactics-0"' } }),
      env,
      null,
    );
    expect(matched.status).toBe(304);
  });

  it('is edge-cached like the lineups', async () => {
    const env = testEnv();
    const cache = fakeCache();
    await handle(new Request('https://api.example/tactics'), env, cache);
    expect([...cache.entries.keys()]).toEqual(['https://api.example/tactics']);
  });
});
