import { describe, expect, it } from 'vitest';
import { hasSqlite } from '../../__tests__/sqlite-d1';
import {
  adminEnv,
  api,
  file,
  lineup,
  NOW,
  PHOTO_BASE,
  PNG_BASE64,
  PNG_DATA_URL,
  pngNumber,
  seededEnv,
  sha,
  sha256Of,
} from './support';

interface Body {
  error: string;
  name: string;
  role: string;
  revision: number;
  ignored: number;
  saved: number;
  skipped: number;
  photos: { embedded: number; links: number; ours: number; copied: number; failed: unknown[] };
  items: { id: string; status: string; stored?: { id: string }; problems: unknown[] }[];
  serverOnly: unknown[];
  lineups: { id: string; title: string; imageUrls: string[] }[];
  changes: { lineupId: string; action: string; actor: string; at: number }[];
}

const json = async (response: Response) => (await response.json()) as Body;

describe.skipIf(!hasSqlite)('auth and guards', () => {
  it('refuses a request without a session with 401', async () => {
    const env = adminEnv({ ALLOW_DEV_IDENTITY: undefined });
    const response = await api(env, '/api/whoami', { host: 'x.workers.dev' });
    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({ error: 'unauthorized' });
  });

  it('answers whoami with the dev identity on localhost, and refuses it elsewhere', async () => {
    const env = adminEnv();
    expect(await json(await api(env, '/api/whoami'))).toEqual({
      id: 'dev',
      name: 'dev@localhost',
      role: 'owner',
    });
    expect((await api(env, '/api/whoami', { host: 'x.workers.dev' })).status).toBe(401);
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
    expect(body.serverOnly).toEqual([]);
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
  const body = (decisions: unknown[], images: Record<string, string> = {}, map = 'de_mirage') => ({
    map,
    decisions,
    images,
  });
  const stored = async (env: ReturnType<typeof adminEnv>) =>
    (await json(await api(env, '/api/lineups/de_mirage'))).lineups;

  it('saves a new lineup, uploads its embedded photo and rewrites the ref', async () => {
    const env = await seededEnv([lineup()]);
    const hash = 'b'.repeat(64);
    const fresh = lineup({
      id: 'fresh',
      title: 'Edited',
      tags: ['meta'],
      origin: { x: 900, y: 0, z: 0 },
      imageUrls: [`local:${hash}`],
      imageCaptions: ['c'],
    });
    const response = await commit(
      env,
      body([{ action: 'add', lineup: fresh }], { [hash]: PNG_DATA_URL }),
    );
    const result = await json(response);

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ saved: 1, skipped: 0, revision: 2, photos: { uploaded: 1 } });
    const [photoKey] = [...env.LINEUP_PHOTOS.entries.keys()];
    expect(photoKey).toMatch(/^[0-9a-f]{64}$/);
    expect(env.LINEUP_PHOTOS.entries.get(photoKey ?? '')?.contentType).toBe('image/png');

    const saved = (await stored(env)).find((entry) => entry.id === 'fresh');
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

  it('replaces a stored lineup with a merge of both sides, photos from both', async () => {
    const siteHash = 'a'.repeat(64);
    const siteUrl = `${PHOTO_BASE}/${siteHash}`;
    const env = await seededEnv([lineup({ imageUrls: [siteUrl], imageCaptions: ['site'] })]);
    const fileHash = 'e'.repeat(64);
    const link = 'https://files.catbox.moe/new.webp';
    const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
    const fetchPhoto = async () => ({ ok: true, bytes, type: 'image/png' }) as const;

    const merged = lineup({
      id: 'some-other-id',
      title: 'Merged title',
      notes: 'from the file',
      imageUrls: [siteUrl, `local:${fileHash}`, link],
      imageCaptions: ['site', 'file', 'link'],
    });
    const response = await commit(
      env,
      body([{ action: 'replace', targetId: 'mirage-1', lineup: merged }], {
        [fileHash]: PNG_DATA_URL,
      }),
      { fetchPhoto },
    );
    expect(await json(response)).toMatchObject({
      saved: 1,
      photos: { uploaded: 1, copied: 1 },
      withheld: [],
    });

    const lineups = await stored(env);
    expect(lineups.map((entry) => entry.id)).toEqual(['mirage-1']);
    const [saved] = lineups;
    expect(saved).toMatchObject({ title: 'Merged title', imageCaptions: ['site', 'file', 'link'] });
    expect(saved?.imageUrls[0]).toBe(siteUrl);
    expect(saved?.imageUrls.slice(1).every((url) => url.startsWith(`${PHOTO_BASE}/`))).toBe(true);
    expect(saved?.imageUrls).toHaveLength(3);
  });

  it('skip writes nothing', async () => {
    const env = await seededEnv([lineup()]);
    const response = await commit(env, body([{ action: 'skip' }]));
    expect(await json(response)).toMatchObject({ saved: 0, skipped: 1, revision: 1 });
  });

  it.each([
    ['a replace without a target', [{ action: 'replace', lineup: lineup() }], 'invalid_decisions'],
    [
      'a replace of a lineup that is not stored',
      [{ action: 'replace', targetId: 'ghost', lineup: lineup() }],
      'invalid_decisions',
    ],
    ['an add of an id that is stored', [{ action: 'add', lineup: lineup() }], 'invalid_decisions'],
    [
      'the same id added twice',
      [
        { action: 'add', lineup: lineup({ id: 'x' }) },
        { action: 'add', lineup: lineup({ id: 'x' }) },
      ],
      'invalid_decisions',
    ],
    ['a body that is not a lineup', [{ action: 'add', lineup: { id: 'x' } }], 'invalid_lineup'],
    [
      'a blank title',
      [{ action: 'add', lineup: lineup({ id: 'x', title: '   ' }) }],
      'invalid_lineup',
    ],
    [
      'a point off the radar',
      [{ action: 'add', lineup: lineup({ id: 'x', landing: { x: 90_000, y: 0, z: 0 } }) }],
      'invalid_lineup',
    ],
    [
      'an http photo link',
      [{ action: 'add', lineup: lineup({ id: 'x', imageUrls: ['http://files.example/a.webp'] }) }],
      'invalid_lineup',
    ],
    [
      'a lineup of another map',
      [{ action: 'add', lineup: lineup({ id: 'x', map: 'de_dust2' }) }],
      'invalid_lineup',
    ],
  ])('refuses %s and writes nothing', async (_name, decisions, code) => {
    const env = await seededEnv([lineup()]);
    const response = await commit(env, body(decisions));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toBe(code);
    expect(await stored(env)).toHaveLength(1);
    expect(env.LINEUP_PHOTOS.entries.size).toBe(0);
  });

  it('withholds a lineup whose photo cannot be stored and saves the others', async () => {
    const env = adminEnv();
    const dead = 'https://files.catbox.moe/dead.webp';
    const missing = `local:${'c'.repeat(64)}`;
    const fetchPhoto = async () => ({ ok: false, reason: 'http_404' }) as const;
    const response = await commit(
      env,
      body([
        { action: 'add', lineup: lineup({ id: 'ok', title: 'Fine' }) },
        { action: 'add', lineup: lineup({ id: 'dead', imageUrls: [dead] }) },
        { action: 'add', lineup: lineup({ id: 'gone', imageUrls: [missing] }) },
      ]),
      { fetchPhoto },
    );
    expect(await json(response)).toMatchObject({
      saved: 1,
      withheld: [
        { id: 'dead', failures: [{ ref: dead, reason: 'http_404' }] },
        { id: 'gone', failures: [{ ref: missing, reason: 'missing' }] },
      ],
    });
    expect((await stored(env)).map((entry) => entry.id)).toEqual(['ok']);

    const retry = await commit(env, body([{ action: 'add', lineup: lineup({ id: 'dead' }) }]));
    expect(await json(retry)).toMatchObject({ saved: 1, withheld: [] });
    expect(await stored(env)).toHaveLength(2);
  });

  it('refuses more photos than one commit may carry', async () => {
    const urls = Array.from({ length: 25 }, (_, index) => `https://files.example/${index}.webp`);
    const response = await commit(
      adminEnv(),
      body([{ action: 'add', lineup: lineup({ imageUrls: urls }) }]),
    );
    expect((await json(response)).error).toBe('too_many_photos');
  });

  it('takes an Inferno-sized import (42 photos) in parts of at most 24', async () => {
    const env = adminEnv();
    const lineups = Array.from({ length: 14 }, (_, index) =>
      lineup({
        id: `inferno-${index}`,
        title: `Lineup ${index}`,
        origin: { x: -2000 + index * 100, y: 200, z: 0 },
        imageUrls: [0, 1, 2].map((photo) => `local:${sha(index * 3 + photo)}`),
      }),
    );
    const images = Object.fromEntries(
      Array.from({ length: 42 }, (_, index) => [sha(index), pngNumber(index)]),
    );
    const parts = [lineups.slice(0, 8), lineups.slice(8)];
    for (const part of parts) {
      const response = await commit(
        env,
        body(
          part.map((entry) => ({ action: 'add', lineup: entry })),
          images,
        ),
      );
      expect(await json(response)).toMatchObject({ saved: part.length, withheld: [] });
    }
    expect(env.LINEUP_PHOTOS.entries.size).toBe(42);
    expect(await stored(env)).toHaveLength(14);

    const whole = await commit(
      adminEnv(),
      body(
        lineups.map((entry) => ({ action: 'add', lineup: { ...entry, id: `again-${entry.id}` } })),
        images,
      ),
    );
    expect((await json(whole)).error).toBe('too_many_photos');
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

describe.skipIf(!hasSqlite)('a re-imported file', () => {
  const link = 'https://files.catbox.moe/a.webp';
  const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
  const fetchPhoto = async () => ({ ok: true, bytes, type: 'image/png' }) as const;
  const preview = async (env: ReturnType<typeof adminEnv>, lineups: unknown[]) =>
    json(await api(env, '/api/preview', { body: { map: 'de_mirage', file: file(lineups) } }));

  it('reads as unchanged after its link photos were copied, and keeps our copy on replace', async () => {
    const env = adminEnv();
    await api(
      env,
      '/api/commit',
      {
        body: {
          map: 'de_mirage',
          images: {},
          decisions: [{ action: 'add', lineup: lineup({ imageUrls: [link] }) }],
        },
      },
      { fetchPhoto },
    );
    const [saved] = (await json(await api(env, '/api/lineups/de_mirage'))).lineups;
    expect(saved?.imageUrls[0]).toMatch(new RegExp(`^${PHOTO_BASE}/[0-9a-f]{64}$`));

    const again = await preview(env, [lineup({ imageUrls: [link] })]);
    expect(again.items.map((item) => item.status)).toEqual(['unchanged']);
    expect(again.photos).toMatchObject({ links: 0, ours: 1 });

    const edited = await preview(env, [lineup({ title: 'Renamed', imageUrls: [link] })]);
    expect(edited.items[0]?.status).toBe('update');
  });

  it('previews an update that adds and removes optional fields', async () => {
    const env = await seededEnv([lineup({ notes: 'old', tags: ['old'] })]);
    const result = await preview(env, [lineup({ author: { name: 'Dan' } })]);
    expect(result.items[0]?.status).toBe('update');
  });

  it('reads as unchanged after its embedded photos were uploaded', async () => {
    const env = adminEnv();
    const hash = await sha256Of(bytes);
    const embedded = lineup({ imageUrls: [`local:${hash}`] });
    await api(env, '/api/commit', {
      body: {
        map: 'de_mirage',
        images: { [hash]: PNG_DATA_URL },
        decisions: [{ action: 'add', lineup: embedded }],
      },
    });
    const again = await preview(env, [embedded]);
    expect(again.items.map((item) => item.status)).toEqual(['unchanged']);
  });

  it('offers the stored lineups the file does not have, and the stored side of an update', async () => {
    const env = await seededEnv([
      lineup(),
      lineup({ id: 'extra', origin: { x: 9000, y: 0, z: 0 } }),
    ]);
    const result = await preview(env, [lineup({ title: 'Changed' })]);
    expect(result.items[0]).toMatchObject({
      status: 'update',
      stored: { id: 'mirage-1' },
      problems: [],
    });
    expect(result.serverOnly.map((entry) => (entry as { id: string }).id)).toEqual(['extra']);
  });
});
