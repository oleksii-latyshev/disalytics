import type { TacticDecision } from '@disa/admin-contract';
import { serializeTacticFile, type Tactic } from '@disa/demo-core';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import { mainPlan, step, tactic } from '../../__tests__/tactics-fixture';
import { checkTacticDecisions, diffTactics, planTactics, tacticsOfFile } from '../helpers/tactics';
import { adminEnv, api, NOW } from './support';

const fileOf = (...tactics: Tactic[]): unknown => JSON.parse(serializeTacticFile(tactics));

describe('tacticsOfFile', () => {
  const read = (value: unknown) => Effect.runPromise(Effect.result(tacticsOfFile(value)));

  it('reads a tactic file and refuses anything else, or a repeated id', async () => {
    expect(await read(fileOf(tactic()))).toMatchObject({ success: [{ id: 'mirage-b-split' }] });
    for (const bad of ['x', { version: 2 }, fileOf(tactic(), tactic())]) {
      expect(await read(bad)).toMatchObject({ failure: { error: 'invalid_file' } });
    }
  });
});

describe('diffTactics and planTactics', () => {
  it('says which fields moved, with step and plan counts', () => {
    const moved = tactic({
      title: 'B split v2',
      side: 'CT',
      rounds: ['eco'],
      description: 'New',
      weapons: { 0: 'AK-47' },
      plans: [
        mainPlan,
        { id: 'b', condition: 'x', parentId: 'main', forkAfter: 0, deaths: {}, steps: [] },
      ],
    });
    const fields = diffTactics(tactic(), moved).map(({ field }) => field);
    expect(fields).toEqual(['title', 'side', 'rounds', 'description', 'weapons', 'plans']);
    expect(diffTactics(tactic(), moved).find(({ field }) => field === 'plans')).toMatchObject({
      before: 1,
      after: 2,
    });
  });

  it('marks content-only changes, and ignores timestamps and a missing author', () => {
    const edited = tactic({
      plans: [{ ...mainPlan, steps: [{ ...step, name: 'Other name' }] }],
    });
    expect(diffTactics(tactic(), edited)).toEqual([{ field: 'content' }]);

    const stored = tactic({ author: 'Ann' });
    const [item] = planTactics([stored], [tactic({ updatedAt: 99 })]);
    expect(item?.status).toBe('unchanged');
  });

  it('classifies new, update and unchanged, and flags problems', () => {
    const items = planTactics([tactic()], [tactic(), tactic({ id: 'two', title: ' ' })]);
    expect(items.map(({ status }) => status)).toEqual(['unchanged', 'new']);
    expect(items[1]?.problems).toEqual(['title_blank']);
    expect(planTactics([tactic()], [tactic({ title: 'Changed' })])[0]?.status).toBe('update');
  });
});

describe('checkTacticDecisions', () => {
  const check = (decisions: TacticDecision[], live: string[] = []) =>
    Effect.runPromise(
      Effect.result(checkTacticDecisions({ decisions, liveIds: new Set(live), author: 'Dev' })),
    );

  it('stamps the committer on a tactic with no author and keeps a credited one', async () => {
    const outcome = await check([
      { action: 'add', tactic: tactic({ id: 'a' }) },
      { action: 'add', tactic: tactic({ id: 'b', author: 'Ann' }) },
      { action: 'skip', tactic: tactic({ id: 'c' }) },
    ]);
    expect(outcome).toMatchObject({
      success: {
        skipped: 1,
        writes: [
          { id: 'a', author: 'Dev' },
          { id: 'b', author: 'Ann' },
        ],
      },
    });
  });

  it('refuses an invalid tactic, a replace of an unknown id, an add of a known one and a repeat', async () => {
    expect(await check([{ action: 'add', tactic: { id: 'x' } }])).toMatchObject({
      failure: { error: 'invalid_tactic' },
    });
    expect(await check([{ action: 'add', tactic: tactic({ title: '' }) }])).toMatchObject({
      failure: { error: 'invalid_tactic' },
    });
    expect(await check([{ action: 'add', tactic: tactic({ map: 'Mirage' }) }])).toMatchObject({
      failure: { error: 'invalid_tactic' },
    });
    expect(await check([{ action: 'replace', tactic: tactic() }])).toMatchObject({
      failure: { error: 'invalid_decisions' },
    });
    expect(await check([{ action: 'add', tactic: tactic() }], ['mirage-b-split'])).toMatchObject({
      failure: { error: 'invalid_decisions' },
    });
    const twice = await check([
      { action: 'add', tactic: tactic() },
      { action: 'add', tactic: tactic() },
    ]);
    expect(twice).toMatchObject({ failure: { error: 'invalid_decisions' } });
  });
});

interface Previewed {
  revision: number;
  items: { id: string; status: string; diff: { field: string }[]; problems: string[] }[];
}
interface Committed {
  error?: string;
  saved: number;
  skipped: number;
  revision: number;
}
interface Listed {
  revision: number;
  tactics: Tactic[];
}

describe.skipIf(!hasSqlite)('tactics over the admin API', () => {
  const preview = async (env: ReturnType<typeof adminEnv>, ...tactics: Tactic[]) =>
    (await (
      await api(env, '/api/tactics/preview', { body: { file: fileOf(...tactics) } })
    ).json()) as Previewed;
  const commit = (env: ReturnType<typeof adminEnv>, decisions: unknown[]) =>
    api(env, '/api/tactics/commit', { body: { decisions } });
  const listed = async (env: ReturnType<typeof adminEnv>) =>
    (await (await api(env, '/api/tactics')).json()) as Listed;

  it('previews new, commits with the committer as author and then reads it unchanged', async () => {
    const env = adminEnv();
    expect((await preview(env, tactic())).items[0]?.status).toBe('new');

    const response = await commit(env, [{ action: 'add', tactic: tactic() }]);
    expect(response.status).toBe(200);
    expect((await response.json()) as Committed).toMatchObject({
      saved: 1,
      skipped: 0,
      revision: 1,
    });

    const site = await listed(env);
    expect(site.tactics).toMatchObject([{ id: 'mirage-b-split', author: 'dev@localhost' }]);
    expect((await preview(env, tactic())).items[0]?.status).toBe('unchanged');
  });

  it('replaces by id, shows the diff, and keeps the author a file names', async () => {
    const env = adminEnv();
    await commit(env, [{ action: 'add', tactic: tactic() }]);
    const changed = tactic({ title: 'B split v2', author: 'Ann' });
    const previewed = await preview(env, changed);
    expect(previewed.items[0]).toMatchObject({ status: 'update' });
    expect(previewed.items[0]?.diff.map(({ field }) => field)).toEqual(['title', 'author']);

    await commit(env, [{ action: 'replace', tactic: changed }]);
    expect((await listed(env)).tactics).toMatchObject([{ title: 'B split v2', author: 'Ann' }]);
  });

  it('skips what the page skipped and refuses an invalid tactic with a coded 400', async () => {
    const env = adminEnv();
    const skipped = await commit(env, [{ action: 'skip', tactic: tactic() }]);
    expect((await skipped.json()) as Committed).toMatchObject({
      saved: 0,
      skipped: 1,
      revision: 0,
    });
    expect((await listed(env)).tactics).toEqual([]);

    const refused = await commit(env, [{ action: 'add', tactic: { id: 'x' } }]);
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as Committed).error).toBe('invalid_tactic');
  });

  it('refuses a file that is no tactic file', async () => {
    const env = adminEnv();
    const response = await api(env, '/api/tactics/preview', { body: { file: { lineups: [] } } });
    expect(response.status).toBe(400);
  });

  it('deletes, logs both writes in the history under the tactic id, and 404s a second delete', async () => {
    const env = adminEnv();
    await commit(env, [{ action: 'add', tactic: tactic() }]);
    expect((await api(env, '/api/tactics/mirage-b-split', { method: 'DELETE' })).status).toBe(200);
    expect((await listed(env)).tactics).toEqual([]);
    expect((await api(env, '/api/tactics/mirage-b-split', { method: 'DELETE' })).status).toBe(404);

    const changes = (await (await api(env, '/api/changes?map=de_mirage')).json()) as {
      changes: { lineupId: string; action: string; at: number }[];
    };
    expect(changes.changes.map(({ action }) => action)).toEqual(['tactic:delete', 'tactic:save']);
    expect(changes.changes[0]).toMatchObject({ lineupId: 'mirage-b-split', at: NOW });
  });

  it('lets an added id come back after a delete', async () => {
    const env = adminEnv();
    await commit(env, [{ action: 'add', tactic: tactic() }]);
    await api(env, '/api/tactics/mirage-b-split', { method: 'DELETE' });
    const again = await commit(env, [{ action: 'add', tactic: tactic() }]);
    expect(again.status).toBe(200);
  });

  describe('saving one tactic', () => {
    const put = (
      env: ReturnType<typeof adminEnv>,
      id: string,
      tactic: unknown,
      basedOn: number | null,
    ) => api(env, `/api/tactics/${id}`, { method: 'PUT', body: { tactic, basedOn } });

    it('creates with the admin as author, replaces keeping a credited author, bumps the revision and logs', async () => {
      const env = adminEnv();
      const created = await put(env, 'mirage-b-split', tactic(), null);
      expect(created.status).toBe(200);
      expect((await created.json()) as { revision: number; tactic: Tactic }).toMatchObject({
        revision: 1,
        tactic: { author: 'dev@localhost' },
      });

      const replaced = await put(env, 'mirage-b-split', tactic({ title: 'v2', updatedAt: 5 }), 1);
      expect(replaced.status).toBe(200);
      expect(((await replaced.json()) as Committed).revision).toBe(2);
      expect((await listed(env)).tactics).toMatchObject([{ title: 'v2', author: 'dev@localhost' }]);

      await put(env, 'mirage-b-split', tactic({ title: 'v3', updatedAt: 6, author: 'Ann' }), 5);
      expect((await listed(env)).tactics).toMatchObject([{ title: 'v3', author: 'Ann' }]);

      const changes = (await (await api(env, '/api/changes?map=de_mirage')).json()) as {
        changes: { lineupId: string; action: string }[];
      };
      expect(changes.changes.map(({ action }) => action)).toEqual([
        'tactic:save',
        'tactic:save',
        'tactic:save',
      ]);
    });

    it('refuses an invalid body, an id that differs from the path and a bad map', async () => {
      const env = adminEnv();
      for (const [id, body] of [
        ['mirage-b-split', { id: 'x' }],
        ['other', tactic()],
        ['mirage-b-split', tactic({ title: '' })],
        ['mirage-b-split', tactic({ map: 'Mirage' })],
      ] as const) {
        const response = await put(env, id, body, null);
        expect(response.status).toBe(400);
        expect(((await response.json()) as Committed).error).toBe('invalid_tactic');
      }
      expect((await listed(env)).tactics).toEqual([]);
    });

    it('refuses a stale editor: a newer stored version, a new tactic whose id exists, a vanished one', async () => {
      const env = adminEnv();
      await put(env, 'mirage-b-split', tactic({ updatedAt: 10 }), null);
      for (const basedOn of [5, 15, null]) {
        const response = await put(
          env,
          'mirage-b-split',
          tactic({ title: 'mine', updatedAt: 20 }),
          basedOn,
        );
        expect(response.status).toBe(400);
        expect(((await response.json()) as Committed).error).toBe('tactic_changed');
      }
      const gone = await put(env, 'other-one', tactic({ id: 'other-one' }), 3);
      expect(((await gone.json()) as Committed).error).toBe('tactic_changed');
      expect((await listed(env)).tactics).toMatchObject([{ title: 'B split' }]);
    });
  });
});
