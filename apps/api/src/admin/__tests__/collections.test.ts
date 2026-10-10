import type { CollectionDecision } from '@disa/admin-contract';
import type { LineupCollection } from '@disa/demo-core';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import {
  checkCollectionDecisions,
  collectionsOfMap,
  planCollections,
  resolveMembers,
} from '../helpers/collections';
import { type adminEnv, api, file, lineup, NOW, seededEnv } from './support';

const collection = (overrides: Partial<LineupCollection> = {}): LineupCollection => ({
  id: 'exec-b',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['a', 'b'],
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const lookup = (live: string[], aliases: [string, string][] = []) => ({
  live: new Set(live),
  aliases: new Map(aliases),
});

describe('resolveMembers', () => {
  it('keeps a live id, follows an alias to a live lineup and drops the rest', () => {
    const result = resolveMembers(
      ['a', 'old-b', 'gone', 'old-c'],
      lookup(
        ['a', 'b'],
        [
          ['old-b', 'b'],
          ['old-c', 'deleted'],
        ],
      ),
    );
    expect(result).toEqual({ lineupIds: ['a', 'b'], dropped: 2 });
  });

  it('counts two members that land on one lineup once', () => {
    expect(resolveMembers(['a', 'old-a'], lookup(['a'], [['old-a', 'a']]))).toEqual({
      lineupIds: ['a'],
      dropped: 0,
    });
  });

  it('prefers the live id over an alias of the same name', () => {
    expect(resolveMembers(['a'], lookup(['a', 'z'], [['a', 'z']])).lineupIds).toEqual(['a']);
  });
});

describe('collectionsOfMap', () => {
  const read = (value: unknown) =>
    Effect.runPromise(Effect.result(collectionsOfMap(value, 'de_mirage')));

  it('reads none from a file without the field, and ignores other maps', async () => {
    expect(await read({ lineups: [] })).toMatchObject({ success: { collections: [], ignored: 0 } });
    const mixed = await read({
      collections: [collection(), collection({ id: 'x', map: 'de_dust2' })],
    });
    expect(mixed).toMatchObject({ success: { ignored: 1 } });
  });

  it('refuses a malformed field, an invalid entry and a repeated id', async () => {
    for (const collections of ['x', [{ id: 'x' }], [collection(), collection()]]) {
      const outcome = await read({ collections });
      expect(outcome).toMatchObject({ failure: { error: 'invalid_file' } });
    }
  });
});

describe('planCollections', () => {
  const plan = (stored: LineupCollection[], incoming: LineupCollection[], live = ['a', 'b']) =>
    planCollections(stored, incoming, 'de_mirage', lookup(live));

  it('marks an unseen id new, with its resolved members and dropped count', () => {
    const [item] = plan([], [collection({ lineupIds: ['a', 'b', 'gone'] })]);
    expect(item).toMatchObject({ status: 'new', dropped: 1, added: ['a', 'b'], problems: [] });
    expect(item?.collection).toMatchObject({ lineupIds: ['a', 'b'] });
  });

  it('marks the same name and members unchanged, whatever the timestamps', () => {
    const [item] = plan([collection({ updatedAt: 99 })], [collection()]);
    expect(item?.status).toBe('unchanged');
  });

  it('marks a rename or a changed membership an update and says what moved', () => {
    const [renamed] = plan([collection({ name: 'Old' })], [collection()]);
    expect(renamed).toMatchObject({ status: 'update', added: [], removed: [] });
    const [moved] = plan([collection({ lineupIds: ['a', 'c'] })], [collection()]);
    expect(moved).toMatchObject({ status: 'update', added: ['b'], removed: ['c'] });
  });

  it('flags a name another collection has, ignoring case, and a name used twice in the file', () => {
    const [clash] = plan([collection({ id: 'other', name: 'execute b' })], [collection()]);
    expect(clash?.problems).toEqual(['name_taken']);
    const twice = plan([], [collection(), collection({ id: 'two', name: 'EXECUTE B' })]);
    expect(twice.map(({ problems }) => problems)).toEqual([[], ['name_taken']]);
  });
});

describe('checkCollectionDecisions', () => {
  const check = (
    decisions: CollectionDecision[],
    stored: LineupCollection[] = [],
    foreign: string[] = [],
  ) =>
    Effect.runPromise(
      Effect.result(
        checkCollectionDecisions({
          map: 'de_mirage',
          decisions,
          stored,
          lookup: lookup(['a', 'b'], [['old', 'b']]),
          now: 50,
          foreign: () => Effect.succeed(new Set(foreign)),
        }),
      ),
    );

  it('resolves members, stamps the times and counts what it dropped and skipped', async () => {
    const outcome = await check([
      { action: 'add', collection: collection({ lineupIds: ['a', 'old', 'gone'] }) },
      { action: 'skip', collection: collection({ id: 'z', name: 'Z' }) },
    ]);
    expect(outcome).toMatchObject({
      success: {
        skipped: 1,
        dropped: 1,
        writes: [{ lineupIds: ['a', 'b'], createdAt: 50, updatedAt: 50 }],
      },
    });
  });

  it('keeps the stored creation time on a replace', async () => {
    const outcome = await check(
      [{ action: 'replace', collection: collection() }],
      [collection({ createdAt: 7 })],
    );
    expect(outcome).toMatchObject({ success: { writes: [{ createdAt: 7, updatedAt: 50 }] } });
  });

  it('refuses a name another stored collection has, in any case', async () => {
    const outcome = await check(
      [{ action: 'add', collection: collection({ id: 'new', name: 'EXECUTE B' }) }],
      [collection()],
    );
    expect(outcome).toMatchObject({ failure: { error: 'collection_name_taken' } });
  });

  it('allows a replace to keep its own name, and a swap of two names across a commit', async () => {
    const stored = [collection(), collection({ id: 'r', name: 'Retake B' })];
    const outcome = await check(
      [
        { action: 'replace', collection: collection({ name: 'Retake B' }) },
        { action: 'replace', collection: collection({ id: 'r', name: 'Execute B' }) },
      ],
      stored,
    );
    expect(outcome).toHaveProperty('success');
  });

  it('refuses two writes with one name, an add of a stored id and a replace of an unknown one', async () => {
    const same = await check([
      { action: 'add', collection: collection() },
      { action: 'add', collection: collection({ id: 'two', name: 'execute b' }) },
    ]);
    expect(same).toMatchObject({ failure: { error: 'collection_name_taken' } });
    const added = await check([{ action: 'add', collection: collection() }], [collection()]);
    expect(added).toMatchObject({ failure: { error: 'invalid_decisions' } });
    const replaced = await check([{ action: 'replace', collection: collection() }]);
    expect(replaced).toMatchObject({ failure: { error: 'invalid_decisions' } });
  });

  it('refuses a collection of another map, a malformed one and an id of another map', async () => {
    const wrong = await check([{ action: 'add', collection: collection({ map: 'de_dust2' }) }]);
    expect(wrong).toMatchObject({ failure: { error: 'invalid_collection' } });
    const malformed = await check([{ action: 'add', collection: { id: 'x' } }]);
    expect(malformed).toMatchObject({ failure: { error: 'invalid_collection' } });
    const foreign = await check([{ action: 'add', collection: collection() }], [], ['exec-b']);
    expect(foreign).toMatchObject({ failure: { error: 'invalid_decisions' } });
  });
});

interface Previewed {
  revision: number;
  ignored: number;
  items: {
    id: string;
    status: string;
    dropped: number;
    problems: string[];
    collection: LineupCollection;
  }[];
}
interface Committed {
  error?: string;
  saved: number;
  skipped: number;
  dropped: number;
  revision: number;
}
interface Listed {
  lineups: { id: string }[];
  collections: LineupCollection[];
}

const withCollections = (collections: unknown[]) => ({
  ...file([]),
  collections,
});

describe.skipIf(!hasSqlite)('collections over the admin API', () => {
  const preview = async (env: ReturnType<typeof adminEnv>, collections: unknown[]) =>
    (await (
      await api(env, '/api/collections/preview', {
        body: { map: 'de_mirage', file: withCollections(collections) },
      })
    ).json()) as Previewed;
  const commit = (env: ReturnType<typeof adminEnv>, decisions: unknown[]) =>
    api(env, '/api/collections/commit', { body: { map: 'de_mirage', decisions } });
  const listed = async (env: ReturnType<typeof adminEnv>) =>
    (await (await api(env, '/api/lineups/de_mirage')).json()) as Listed;
  const seeded = () => seededEnv([lineup({ id: 'a' }), lineup({ id: 'b' })]);

  it('previews against the lineups on the site and counts the members it would drop', async () => {
    const env = await seeded();
    const result = await preview(env, [collection({ lineupIds: ['a', 'skipped'] })]);
    expect(result.items[0]).toMatchObject({ status: 'new', dropped: 1 });
    expect(result.items[0]?.collection.lineupIds).toEqual(['a']);
  });

  it('commits, serves the collection with the map and logs it', async () => {
    const env = await seeded();
    const response = await commit(env, [{ action: 'add', collection: collection() }]);
    expect(response.status).toBe(200);
    expect((await response.json()) as Committed).toMatchObject({
      saved: 1,
      dropped: 0,
      revision: 2,
    });

    const { collections } = await listed(env);
    expect(collections).toMatchObject([{ id: 'exec-b', lineupIds: ['a', 'b'], createdAt: NOW }]);
    expect((await preview(env, [collection()])).items[0]?.status).toBe('unchanged');

    const changes = (await (await api(env, '/api/changes')).json()) as {
      changes: { lineupId: string; action: string }[];
    };
    expect(changes.changes[0]).toMatchObject({ lineupId: 'exec-b', action: 'collection:save' });
  });

  it('resolves a member through the alias of a merged lineup', async () => {
    const env = await seeded();
    await api(env, '/api/commit', {
      body: {
        map: 'de_mirage',
        images: {},
        decisions: [
          { action: 'replace', targetId: 'a', sourceId: 'friend-a', lineup: lineup({ id: 'a' }) },
        ],
      },
    });
    const result = await commit(env, [
      { action: 'add', collection: collection({ lineupIds: ['friend-a', 'nowhere'] }) },
    ]);
    expect((await result.json()) as Committed).toMatchObject({ saved: 1, dropped: 1 });
    expect((await listed(env)).collections[0]?.lineupIds).toEqual(['a']);
  });

  it('refuses a name already taken on the map with a coded 400', async () => {
    const env = await seeded();
    await commit(env, [{ action: 'add', collection: collection() }]);
    const clash = await commit(env, [
      { action: 'add', collection: collection({ id: 'other', name: 'execute b' }) },
    ]);
    expect(clash.status).toBe(400);
    expect(((await clash.json()) as Committed).error).toBe('collection_name_taken');
    expect(
      (await preview(env, [collection({ id: 'other', name: 'execute b' })])).items[0]?.problems,
    ).toEqual(['name_taken']);
  });

  it('replaces by id, deletes, and drops a member whose lineup was deleted later', async () => {
    const env = await seeded();
    await commit(env, [{ action: 'add', collection: collection() }]);
    await commit(env, [{ action: 'replace', collection: collection({ name: 'Execute B2' }) }]);
    expect((await listed(env)).collections[0]?.name).toBe('Execute B2');

    await api(env, '/api/lineups/b', { method: 'DELETE' });
    expect((await listed(env)).collections[0]?.lineupIds).toEqual(['a']);

    expect((await api(env, '/api/collections/exec-b', { method: 'DELETE' })).status).toBe(200);
    expect((await listed(env)).collections).toEqual([]);
    expect((await api(env, '/api/collections/exec-b', { method: 'DELETE' })).status).toBe(404);
  });
});
