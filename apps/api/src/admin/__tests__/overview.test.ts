import type { OverviewResponse } from '@disa/admin-contract';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import { tactic } from '../../__tests__/tactics-fixture';
import { makeLineupStorage } from '../../modules/lineups';
import { makeTacticStorage } from '../../modules/tactics';
import { kindOfAction, mergeMaps, titleOfBody, topContributors, WEEK_MS } from '../overview';
import { adminEnv, api, lineup, NOW, seededEnv } from './support';

describe('kindOfAction', () => {
  it('reads the kind and verb of every action the log holds', () => {
    expect(kindOfAction('save')).toEqual({ kind: 'lineup', saved: true });
    expect(kindOfAction('delete')).toEqual({ kind: 'lineup', saved: false });
    expect(kindOfAction('collection:save')).toEqual({ kind: 'collection', saved: true });
    expect(kindOfAction('tactic:delete')).toEqual({ kind: 'tactic', saved: false });
    expect(kindOfAction('tactic:rename')).toBeNull();
    expect(kindOfAction('other:save')).toBeNull();
  });
});

describe('titleOfBody', () => {
  it('reads a title, or a collection name, and is quiet about anything else', () => {
    expect(titleOfBody('lineup', '{"title":"Window"}')).toBe('Window');
    expect(titleOfBody('collection', '{"name":"Execute B","title":"x"}')).toBe('Execute B');
    expect(titleOfBody('tactic', '{"title":""}')).toBeUndefined();
    expect(titleOfBody('tactic', 'nope')).toBeUndefined();
    expect(titleOfBody('tactic', '3')).toBeUndefined();
  });
});

describe('mergeMaps and topContributors', () => {
  it('joins the three counts by map, in map order', () => {
    expect(
      mergeMaps({
        lineups: [{ map: 'de_nuke', count: 2 }],
        collections: [{ map: 'de_dust2', count: 1 }],
        tactics: [{ map: 'de_nuke', count: 3 }],
      }),
    ).toEqual([
      { map: 'de_dust2', lineups: 0, collections: 1, tactics: 0 },
      { map: 'de_nuke', lineups: 2, collections: 0, tactics: 3 },
    ]);
  });

  it('keeps three people and finds the asker among all of them', () => {
    const people = ['A', 'B', 'C', 'D'].map((name, index) => ({
      name,
      total: 10 - index,
      byMap: {},
    }));
    expect(topContributors(people, 'D')).toMatchObject({ mine: 7 });
    expect(topContributors(people, 'D').top.map(({ name }) => name)).toEqual(['A', 'B', 'C']);
    expect(topContributors(people, 'Nobody').mine).toBe(0);
  });
});

describe.skipIf(!hasSqlite)('GET /api/overview', () => {
  const read = async (target: ReturnType<typeof adminEnv>, now = NOW) => {
    const response = await api(target, '/api/overview', {}, { now: () => now });
    expect(response.status).toBe(200);
    return (await response.json()) as OverviewResponse;
  };

  it('is empty on a new site', async () => {
    expect(await read(adminEnv())).toEqual({
      maps: [],
      totals: { lineups: 0, collections: 0, tactics: 0, maps: 0 },
      week: { lineups: 0, collections: 0, tactics: 0 },
      recent: [],
      contributors: [],
      mine: 0,
      mineLastAt: null,
    });
  });

  it('needs a signed-in person', async () => {
    const target = adminEnv({ ALLOW_DEV_IDENTITY: undefined });
    expect((await api(target, '/api/overview')).status).toBe(401);
  });

  it('counts per map, the week, the latest changes with titles and the top people', async () => {
    const target = await seededEnv([], {});
    const lineups = makeLineupStorage(target.LINEUPS_DB);
    const old = NOW - WEEK_MS - 1000;
    const run = <A>(effect: Effect.Effect<A, unknown>) => Effect.runPromise(effect);

    await run(
      lineups.saveLineups({
        lineups: [lineup({ id: 'old', title: 'Old one' })],
        actor: 'Ann',
        now: old,
      }),
    );
    await run(
      lineups.saveLineups({
        lineups: [
          lineup({ id: 'a', title: 'Window' }),
          lineup({ id: 'b', title: 'Jungle', map: 'de_nuke' }),
        ],
        actor: 'dev@localhost',
        now: NOW - 3000,
      }),
    );
    await run(
      lineups.saveLineups({
        lineups: [lineup({ id: 'old', title: 'Old one, renamed' })],
        actor: 'Ann',
        now: NOW - 2000,
      }),
    );
    await run(
      lineups.saveCollections({
        collections: [
          {
            id: 'c1',
            name: 'Execute B',
            map: 'de_mirage',
            lineupIds: ['a'],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        actor: 'Ann',
        now: NOW - 1500,
      }),
    );
    await run(
      makeTacticStorage(target.LINEUPS_DB).save({
        tactics: [tactic({ id: 't1', title: 'B split' })],
        actor: 'Ann',
        now: NOW - 1000,
      }),
    );
    await run(lineups.deleteLineup({ id: 'b', actor: 'Ann', now: NOW - 500 }));

    const overview = await read(target);
    expect(overview.maps).toEqual([{ map: 'de_mirage', lineups: 2, collections: 1, tactics: 1 }]);
    expect(overview.totals).toEqual({ lineups: 2, collections: 1, tactics: 1, maps: 1 });
    expect(overview.week).toEqual({ lineups: 1, collections: 1, tactics: 1 });
    expect(
      overview.recent.map(({ kind, action, actor, title }) => [kind, action, actor, title]),
    ).toEqual([
      ['lineup', 'delete', 'Ann', 'Jungle'],
      ['tactic', 'add', 'Ann', 'B split'],
      ['collection', 'add', 'Ann', 'Execute B'],
      ['lineup', 'update', 'Ann', 'Old one, renamed'],
      ['lineup', 'add', 'dev@localhost', 'Jungle'],
      ['lineup', 'add', 'dev@localhost', 'Window'],
      ['lineup', 'add', 'Ann', 'Old one, renamed'],
    ]);
    expect(overview.contributors.map(({ name, total }) => [name, total])).toEqual([
      ['Ann', 1],
      ['dev@localhost', 1],
    ]);
    expect(overview.mine).toBe(1);
    expect(overview.mineLastAt).toBe(NOW - 3000);
  });

  it('keeps the latest eight changes only', async () => {
    const target = adminEnv();
    const lineups = makeLineupStorage(target.LINEUPS_DB);
    for (let index = 0; index < 10; index += 1) {
      await Effect.runPromise(
        lineups.saveLineups({
          lineups: [lineup({ id: `l${index}`, title: `L${index}` })],
          actor: 'Ann',
          now: NOW - 100 + index,
        }),
      );
    }
    const overview = await read(target);
    expect(overview.recent).toHaveLength(8);
    expect(overview.recent[0]?.title).toBe('L9');
  });
});
