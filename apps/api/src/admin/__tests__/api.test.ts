import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import { makeLineupStorage } from '../../modules/lineups';
import { adminEnv, api, file, lineup, NOW, PHOTO_BASE, PNG_DATA_URL, seededEnv } from './support';

interface Body {
  error: string;
  email: string;
  revision: number;
  ignored: number;
  saved: number;
  skipped: number;
  photos: { embedded: number; links: number; ours: number; copied: number; failed: unknown[] };
  items: { id: string; status: string }[];
  lineups: { id: string; title: string; imageUrls: string[] }[];
  changes: { lineupId: string; action: string; actor: string; at: number }[];
}

const json = async (response: Response) => (await response.json()) as Body;
const idsOf = async (response: Response) => (await json(response)).lineups.map((l) => l.id);

describe.skipIf(!hasSqlite)('auth and guards', () => {
  it('refuses everything with 403 until Access is configured', async () => {
    const env = adminEnv({ ALLOW_DEV_IDENTITY: undefined });
    const response = await api(env, '/api/whoami', { host: 'x.workers.dev' });
    expect(response.status).toBe(403);
    expect(await json(response)).toEqual({ error: 'forbidden' });
  });

  it('answers whoami with the dev identity on localhost, and refuses it elsewhere', async () => {
    const env = adminEnv();
    expect(await json(await api(env, '/api/whoami'))).toEqual({ email: 'dev@localhost' });
    expect((await api(env, '/api/whoami', { host: 'x.workers.dev' })).status).toBe(403);
  });

  it('refuses a cross-site write, a non-JSON body and an oversized one', async () => {
    const env = adminEnv();
    const body = { map: 'de_mirage', file: file([]) };
    const cross = await api(env, '/api/preview', {
      body,
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    expect(cross.status).toBe(403);

    const plain = await api(env, '/api/preview', {
      body,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(plain.status).toBe(400);
    expect((await json(plain)).error).toBe('invalid_json');

    const big = await api(env, '/api/preview', {
      body,
      headers: { 'Content-Length': String(50 * 1024 * 1024) },
    });
    expect(big.status).toBe(413);
  });

  it('answers 404 for unknown routes and a wrong method', async () => {
    const env = adminEnv();
    expect((await api(env, '/api/nothing')).status).toBe(404);
    expect((await api(env, '/api/commit')).status).toBe(404);
  });
});

describe.skipIf(!hasSqlite)('POST /api/preview', () => {
  it('classifies lineups and ignores other maps', async () => {
    const env = await seededEnv([lineup()]);
    const incoming = [
      lineup({ title: 'Changed' }),
      lineup({
        id: 'fresh',
        origin: { x: 9000, y: 0, z: 0 },
        imageUrls: ['https://files.catbox.moe/a.webp'],
      }),
      lineup({ id: 'dust', map: 'de_dust2' }),
    ];
    const response = await api(env, '/api/preview', {
      body: { map: 'de_mirage', file: file(incoming) },
    });
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.items.map((item) => [item.id, item.status])).toEqual([
      ['mirage-1', 'update'],
      ['fresh', 'new'],
    ]);
    expect(body.ignored).toBe(1);
    expect(body.revision).toBe(1);
    expect(body.photos).toEqual({ embedded: 0, links: 1, ours: 0 });
  });

  it('normalises a legacy group before comparing', async () => {
    const stored = lineup({ originGroupId: 'g1' });
    const env = await seededEnv([stored]);
    const legacy = lineup({ groupId: 'g1', groupTarget: 'origin' });
    const body = await json(
      await api(env, '/api/preview', { body: { map: 'de_mirage', file: file([legacy]) } }),
    );
    expect(body.items[0]?.status).toBe('unchanged');
  });

  it.each([
    ['a bad map', { map: 'mirage', file: file([]) }, 'invalid_request'],
    ['a file without lineups', { map: 'de_mirage', file: {} }, 'invalid_file'],
    ['an invalid lineup', { map: 'de_mirage', file: file([{ id: 'x' }]) }, 'invalid_file'],
    ['a repeated id', { map: 'de_mirage', file: file([lineup(), lineup()]) }, 'invalid_file'],
  ])('answers 400 for %s', async (_name, body, code) => {
    const response = await api(adminEnv(), '/api/preview', { body });
    expect(response.status).toBe(400);
    expect((await json(response)).error).toBe(code);
  });
});

describe.skipIf(!hasSqlite)('POST /api/commit', () => {
  const commit = (env: ReturnType<typeof adminEnv>, body: unknown, config = {}) =>
    api(env, '/api/commit', { body }, config);

  it('saves new lineups, uploads embedded photos and rewrites their refs', async () => {
    const env = await seededEnv([lineup()]);
    const hash = 'b'.repeat(64);
    const fresh = lineup({
      id: 'fresh',
      origin: { x: 9000, y: 0, z: 0 },
      imageUrls: [`local:${hash}`],
      imageCaptions: ['c'],
      isBuiltIn: true,
    });
    const response = await commit(env, {
      map: 'de_mirage',
      file: file([fresh], { [hash]: PNG_DATA_URL }),
      resolutions: [{ id: 'fresh', action: 'add', title: ' Edited ', tags: ['meta'] }],
      copyLinkPhotos: false,
    });
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ saved: 1, skipped: 0, revision: 2, photos: { uploaded: 1 } });
    const [photoKey] = [...env.LINEUP_PHOTOS.entries.keys()];
    expect(photoKey).toMatch(/^[0-9a-f]{64}$/);
    expect(env.LINEUP_PHOTOS.entries.get(photoKey ?? '')?.contentType).toBe('image/png');

    const stored = await Effect.runPromise(makeLineupStorage(env.LINEUPS_DB).readMap('de_mirage'));
    const saved = stored.lineups.find((entry) => entry.id === 'fresh');
    expect(saved).toMatchObject({
      title: 'Edited',
      tags: ['meta'],
      imageUrls: [`${PHOTO_BASE}/${photoKey}`],
    });

    const changes = await json(await api(env, '/api/changes?map=de_mirage'));
    expect(changes.changes[0]).toMatchObject({
      lineupId: 'fresh',
      action: 'save',
      actor: 'dev@localhost',
      at: NOW,
    });
  });

  it('replaces an update in place, and keep-both writes a new id', async () => {
    const replace = await seededEnv([lineup()]);
    await commit(replace, {
      map: 'de_mirage',
      file: file([lineup({ title: 'New title' })]),
      resolutions: [{ id: 'mirage-1', action: 'replace' }],
      copyLinkPhotos: false,
    });
    const replaced = await json(await api(replace, '/api/lineups/de_mirage'));
    expect(replaced.lineups.map((l) => [l.id, l.title])).toEqual([['mirage-1', 'New title']]);

    const both = await seededEnv([lineup()]);
    await commit(both, {
      map: 'de_mirage',
      file: file([lineup({ title: 'New title' })]),
      resolutions: [{ id: 'mirage-1', action: 'keep-both' }],
      copyLinkPhotos: false,
    });
    const ids = await idsOf(await api(both, '/api/lineups/de_mirage'));
    expect(ids).toHaveLength(2);
    expect(ids.some((id) => /^mirage-1-[0-9a-f]{8}$/.test(id))).toBe(true);
  });

  it('replaces the candidate when a duplicate is replaced, and skip writes nothing', async () => {
    const dup = lineup({ id: 'other', origin: { x: 110, y: 200, z: 0 } });
    const replace = await seededEnv([lineup()]);
    await commit(replace, {
      map: 'de_mirage',
      file: file([dup]),
      resolutions: [{ id: 'other', action: 'replace' }],
      copyLinkPhotos: false,
    });
    const ids = await idsOf(await api(replace, '/api/lineups/de_mirage'));
    expect(ids).toEqual(['mirage-1']);

    const skip = await seededEnv([lineup()]);
    const response = await commit(skip, {
      map: 'de_mirage',
      file: file([dup]),
      resolutions: [{ id: 'other', action: 'skip' }],
      copyLinkPhotos: false,
    });
    expect(await json(response)).toMatchObject({ saved: 0, skipped: 1, revision: 1 });
  });

  it('refuses an action the status does not allow, and a missing or unknown decision', async () => {
    const env = await seededEnv([lineup()]);
    const base = {
      map: 'de_mirage',
      file: file([lineup({ id: 'new-one', origin: { x: 9000, y: 0, z: 0 } })]),
      copyLinkPhotos: false,
    };
    const wrong = await commit(env, {
      ...base,
      resolutions: [{ id: 'new-one', action: 'replace' }],
    });
    expect((await json(wrong)).error).toBe('invalid_resolutions');
    const missing = await commit(env, { ...base, resolutions: [] });
    expect((await json(missing)).error).toBe('missing_resolution');
    const unknown = await commit(env, { ...base, resolutions: [{ id: 'ghost', action: 'add' }] });
    expect(unknown.status).toBe(400);
    const blank = await commit(env, {
      ...base,
      resolutions: [{ id: 'new-one', action: 'add', title: '  ' }],
    });
    expect((await json(blank)).error).toBe('invalid_resolutions');
  });

  it('rejects an embedded photo that is not an image before writing anything', async () => {
    const env = adminEnv();
    const hash = 'c'.repeat(64);
    const response = await commit(env, {
      map: 'de_mirage',
      file: file([lineup({ imageUrls: [`local:${hash}`] })], {
        [hash]: `data:image/png;base64,${btoa('hello')}`,
      }),
      resolutions: [{ id: 'mirage-1', action: 'add' }],
      copyLinkPhotos: false,
    });
    expect(response.status).toBe(400);
    expect((await json(response)).error).toBe('invalid_photo');
    expect(env.LINEUP_PHOTOS.entries.size).toBe(0);
    const stored = await json(await api(env, '/api/lineups/de_mirage'));
    expect(stored.lineups).toEqual([]);
  });

  it('refuses a file that references a photo it does not embed', async () => {
    const response = await commit(adminEnv(), {
      map: 'de_mirage',
      file: file([lineup({ imageUrls: [`local:${'d'.repeat(64)}`] })]),
      resolutions: [{ id: 'mirage-1', action: 'add' }],
      copyLinkPhotos: false,
    });
    expect((await json(response)).error).toBe('invalid_file');
  });

  it('leaves link photos alone unless asked, and copies them when asked', async () => {
    const link = 'https://files.catbox.moe/a.webp';
    const bytes = Uint8Array.from(atob(PNG_DATA_URL.split(',')[1] ?? ''), (c) => c.charCodeAt(0));
    const fetchPhoto = async (url: string) =>
      url === link
        ? ({ ok: true, bytes, type: 'image/png' } as const)
        : ({ ok: false, reason: 'http_404' } as const);
    const body = (copy: boolean, urls: string[]) => ({
      map: 'de_mirage',
      file: file([lineup({ imageUrls: urls })]),
      resolutions: [{ id: 'mirage-1', action: 'add' }],
      copyLinkPhotos: copy,
    });

    const left = adminEnv();
    await commit(left, body(false, [link]), { fetchPhoto });
    expect((await json(await api(left, '/api/lineups/de_mirage'))).lineups[0]?.imageUrls).toEqual([
      link,
    ]);
    expect(left.LINEUP_PHOTOS.entries.size).toBe(0);

    const copied = adminEnv();
    const dead = 'https://files.catbox.moe/dead.webp';
    const response = await json(await commit(copied, body(true, [link, dead]), { fetchPhoto }));
    expect(response.photos).toMatchObject({
      copied: 1,
      failed: [{ url: dead, reason: 'http_404' }],
    });
    const [urlA, urlB] =
      (await json(await api(copied, '/api/lineups/de_mirage'))).lineups[0]?.imageUrls ?? [];
    expect(urlA).toMatch(new RegExp(`^${PHOTO_BASE}/[0-9a-f]{64}$`));
    expect(urlB).toBe(dead);
  });

  it('refuses more photos than one commit may carry', async () => {
    const urls = Array.from({ length: 25 }, (_, index) => `https://files.example/${index}.webp`);
    const response = await commit(adminEnv(), {
      map: 'de_mirage',
      file: file([lineup({ imageUrls: urls })]),
      resolutions: [{ id: 'mirage-1', action: 'add' }],
      copyLinkPhotos: true,
    });
    expect((await json(response)).error).toBe('too_many_photos');
  });
});

describe.skipIf(!hasSqlite)('lineups and changes', () => {
  it('lists a map, deletes a lineup and logs it, 404s the unknown', async () => {
    const env = await seededEnv([lineup()]);
    const list = await json(await api(env, '/api/lineups/de_mirage'));
    expect(list.lineups).toHaveLength(1);

    const removed = await api(env, '/api/lineups/mirage-1', { method: 'DELETE' });
    expect(removed.status).toBe(200);
    expect((await json(await api(env, '/api/lineups/de_mirage'))).lineups).toEqual([]);
    const changes = await json(await api(env, '/api/changes'));
    expect(changes.changes[0]).toMatchObject({ action: 'delete', actor: 'dev@localhost' });

    expect((await api(env, '/api/lineups/ghost', { method: 'DELETE' })).status).toBe(404);
    expect((await api(env, '/api/lineups/Mirage')).status).toBe(400);
    expect((await api(env, '/api/changes?map=nope')).status).toBe(400);
  });
});

describe.skipIf(!hasSqlite)('links that were copied before', () => {
  const link = 'https://files.catbox.moe/a.webp';
  const bytes = Uint8Array.from(atob(PNG_DATA_URL.split(',')[1] ?? ''), (c) => c.charCodeAt(0));
  const fetchPhoto = async () => ({ ok: true, bytes, type: 'image/png' }) as const;
  const body = (action: 'add' | 'replace', copy: boolean) => ({
    map: 'de_mirage',
    file: file([lineup({ imageUrls: [link] })]),
    resolutions: [{ id: 'mirage-1', action }],
    copyLinkPhotos: copy,
  });

  it('reads a re-imported file as unchanged and keeps our copy on replace', async () => {
    const env = adminEnv();
    await api(env, '/api/commit', { body: body('add', true) }, { fetchPhoto });
    const [stored] = (await json(await api(env, '/api/lineups/de_mirage'))).lineups;
    expect(stored?.imageUrls[0]).toMatch(new RegExp(`^${PHOTO_BASE}/[0-9a-f]{64}$`));

    const again = await json(
      await api(env, '/api/preview', {
        body: { map: 'de_mirage', file: file([lineup({ imageUrls: [link] })]) },
      }),
    );
    expect(again.items.map((item) => item.status)).toEqual(['unchanged']);
    expect(again.photos).toMatchObject({ links: 0, ours: 1 });

    // Edited in the file, then replaced: the stored copy stays, the catbox link does not return.
    const changed = file([lineup({ title: 'Renamed', imageUrls: [link] })]);
    const preview = await json(
      await api(env, '/api/preview', { body: { map: 'de_mirage', file: changed } }),
    );
    expect(preview.items[0]?.status).toBe('update');
    await api(env, '/api/commit', {
      body: {
        map: 'de_mirage',
        file: changed,
        resolutions: [{ id: 'mirage-1', action: 'replace' }],
        copyLinkPhotos: false,
      },
    });
    const [after] = (await json(await api(env, '/api/lineups/de_mirage'))).lineups;
    expect(after).toMatchObject({ title: 'Renamed', imageUrls: stored?.imageUrls });
  });

  it('does not remember a link that was not copied', async () => {
    const env = adminEnv();
    await api(env, '/api/commit', { body: body('add', false) });
    const preview = await json(
      await api(env, '/api/preview', {
        body: { map: 'de_mirage', file: file([lineup({ imageUrls: [link] })]) },
      }),
    );
    expect(preview.items[0]?.status).toBe('unchanged');
    expect(preview.photos.links).toBe(1);
  });
});
