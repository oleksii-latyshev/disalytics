import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite, sqliteD1 } from '../../../__tests__/sqlite-d1';
import { lineup, testEnv } from '../../../__tests__/support';
import { handle } from '../../../app';
import { makeLineupStorage } from '..';

const run = Effect.runPromise;

describe.skipIf(!hasSqlite)('lineup storage over real SQLite', () => {
  it('saves many lineups with one revision bump per map and returns them as built-ins', async () => {
    const storage = makeLineupStorage(sqliteD1());
    const many = Array.from({ length: 25 }, (_, index) => ({
      ...lineup,
      id: `mirage-${index}`,
      createdAt: index,
    }));

    await run(
      storage.saveLineups({
        lineups: [...many, { ...lineup, id: 'dust', map: 'de_dust2' }],
        actor: 'a@b.c',
        now: 5,
      }),
    );
    const mirage = await run(storage.readMap('de_mirage'));

    expect(mirage.revision).toBe(1);
    expect(mirage.lineups).toHaveLength(25);
    expect(mirage.lineups[0]).toEqual({ ...many[0], isBuiltIn: true });
    expect((await run(storage.readMap('de_dust2'))).revision).toBe(1);
    expect((await run(storage.readMap('de_nuke'))).revision).toBe(0);
  });

  it('replaces a lineup and bumps the revision again', async () => {
    const storage = makeLineupStorage(sqliteD1());
    await run(storage.saveLineups({ lineups: [lineup], actor: 'a', now: 1 }));
    await run(
      storage.saveLineups({ lineups: [{ ...lineup, title: 'Renamed' }], actor: 'b', now: 2 }),
    );

    const { revision, lineups } = await run(storage.readMap('de_mirage'));
    expect(revision).toBe(2);
    expect(lineups.map((entry) => entry.title)).toEqual(['Renamed']);
  });

  it('soft-deletes, hides the lineup, bumps the revision and reports a missing one', async () => {
    const storage = makeLineupStorage(sqliteD1());
    await run(storage.saveLineups({ lineups: [lineup], actor: 'a', now: 1 }));

    expect(await run(storage.deleteLineup({ id: lineup.id, actor: 'a', now: 2 }))).toBe(true);
    expect(await run(storage.deleteLineup({ id: lineup.id, actor: 'a', now: 3 }))).toBe(false);
    expect(await run(storage.readMap('de_mirage'))).toMatchObject({ revision: 2, lineups: [] });
  });
});

describe.skipIf(!hasSqlite)('GET /lineups/:map', () => {
  it('answers with the lineups, an ETag on the revision and the cache policy', async () => {
    const env = testEnv();
    await run(
      makeLineupStorage(env.LINEUPS_DB).saveLineups({ lineups: [lineup], actor: 'a', now: 1 }),
    );

    const response = await handle(new Request('https://api.example/lineups/de_mirage'), env, null);

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe('"de_mirage-1"');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=600',
    );
    expect(await response.json()).toEqual({
      map: 'de_mirage',
      revision: 1,
      lineups: [{ ...lineup, isBuiltIn: true }],
    });
  });

  it('answers 304 when the ETag matches and revision 0 for an unseeded map', async () => {
    const env = testEnv();
    const empty = await handle(new Request('https://api.example/lineups/de_dust2'), env, null);
    expect(await empty.json()).toEqual({ map: 'de_dust2', revision: 0, lineups: [] });

    const matched = await handle(
      new Request('https://api.example/lineups/de_dust2', {
        headers: { 'If-None-Match': '"de_dust2-0"' },
      }),
      env,
      null,
    );
    expect(matched.status).toBe(304);
    expect(await matched.text()).toBe('');
  });
});

describe.skipIf(!hasSqlite)('GET /lineups', () => {
  it('summarises every map with its revision and live count, cached like a map', async () => {
    const env = testEnv();
    const storage = makeLineupStorage(env.LINEUPS_DB);
    await run(
      storage.saveLineups({
        lineups: [
          lineup,
          { ...lineup, id: 'mirage-2' },
          { ...lineup, id: 'dust', map: 'de_dust2' },
        ],
        actor: 'a',
        now: 1,
      }),
    );
    await run(storage.deleteLineup({ id: 'mirage-2', actor: 'a', now: 2 }));
    await run(storage.deleteLineup({ id: 'dust', actor: 'a', now: 3 }));

    const response = await handle(new Request('https://api.example/lineups'), env, null);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=600',
    );
    expect(await response.json()).toEqual({
      maps: [
        { map: 'de_dust2', revision: 2, count: 0 },
        { map: 'de_mirage', revision: 2, count: 1 },
      ],
    });
  });

  it('is empty before anything is seeded', async () => {
    const response = await handle(new Request('https://api.example/lineups'), testEnv(), null);
    expect(await response.json()).toEqual({ maps: [] });
  });
});
