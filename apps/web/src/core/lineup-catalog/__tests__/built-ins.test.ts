import type { Lineup, LineupCollection } from '@disa/demo-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stored = vi.hoisted(() => new Map<string, unknown>());

vi.mock('@disa/demo-store', () => ({
  openBuiltInLineupStore: async () => ({
    get: async (map: string) => stored.get(map) ?? null,
    put: async (map: string, copy: unknown) => {
      stored.set(map, copy);
    },
    close: () => {},
  }),
}));

import {
  fetchBuiltIns,
  loadBuiltIns,
  loadOfflineBuiltIns,
  loadOfflineCatalog,
  refreshCatalog,
  syncBuiltIns,
} from '../helpers/built-ins';

const remote: Lineup = {
  id: 'api-1',
  title: 'From the API',
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

const executeB: LineupCollection = {
  id: 'exec-b',
  name: 'Execute B',
  map: 'de_mirage',
  lineupIds: ['api-1'],
  createdAt: 1,
  updatedAt: 1,
};

afterEach(() => {
  stored.clear();
  vi.unstubAllGlobals();
});

describe('fetchBuiltIns', () => {
  it('marks valid lineups of the map as built-in and drops the rest', async () => {
    const result = await fetchBuiltIns('de_mirage', async () =>
      Response.json({
        map: 'de_mirage',
        revision: 2,
        lineups: [remote, { id: 'bad' }, { ...remote, id: 'other', map: 'de_dust2' }],
      }),
    );

    expect(result).toEqual({
      revision: 2,
      lineups: [{ ...remote, isBuiltIn: true }],
      collections: [],
    });
  });

  it('reads the collections of the map, marks them built-in and drops the invalid ones', async () => {
    const result = await fetchBuiltIns('de_mirage', async () =>
      Response.json({
        map: 'de_mirage',
        revision: 2,
        lineups: [remote],
        collections: [executeB, { id: 'bad' }, { ...executeB, id: 'dust', map: 'de_dust2' }, 'x'],
      }),
    );

    expect(result?.collections).toEqual([{ ...executeB, isBuiltIn: true }]);
  });

  it('reads a response from before collections as having none', async () => {
    const result = await fetchBuiltIns('de_mirage', async () =>
      Response.json({ map: 'de_mirage', revision: 2, lineups: [remote] }),
    );
    expect(result?.collections).toEqual([]);

    const malformed = await fetchBuiltIns('de_mirage', async () =>
      Response.json({ map: 'de_mirage', revision: 2, lineups: [], collections: 'x' }),
    );
    expect(malformed?.collections).toEqual([]);
  });

  it('is null for an error status, a thrown fetch, a malformed body and an unseeded map', async () => {
    expect(
      await fetchBuiltIns('de_mirage', async () => new Response('no', { status: 500 })),
    ).toBeNull();
    expect(
      await fetchBuiltIns('de_mirage', async () => {
        throw new Error('offline');
      }),
    ).toBeNull();
    expect(await fetchBuiltIns('de_mirage', async () => Response.json({ lineups: 1 }))).toBeNull();
    expect(
      await fetchBuiltIns('de_mirage', async () => Response.json({ revision: 0, lineups: [] })),
    ).toBeNull();
  });
});

describe('the stored catalog', () => {
  it('keeps the collections with the lineups and serves them offline', async () => {
    const fresh = await refreshCatalog('de_mirage', async () =>
      Response.json({ map: 'de_mirage', revision: 3, lineups: [remote], collections: [executeB] }),
    );

    expect(fresh?.collections).toEqual([{ ...executeB, isBuiltIn: true }]);
    expect(stored.get('de_mirage')).toMatchObject({ revision: 3 });
    const offline = await loadOfflineCatalog('de_mirage');
    expect(offline.lineups.map((lineup) => lineup.id)).toEqual(['api-1']);
    expect(offline.collections).toEqual([{ ...executeB, isBuiltIn: true }]);
  });

  it('reads a copy stored before collections existed, and the bundled snapshot, as having none', async () => {
    stored.set('de_nuke', { revision: 1, lineups: [], collections: [] });
    expect((await loadOfflineCatalog('de_nuke')).collections).toEqual([]);
    expect((await loadOfflineCatalog('de_inferno')).collections).toEqual([]);
  });

  it('keeps the stored copy when the API cannot be reached', async () => {
    stored.set('de_mirage', { revision: 1, lineups: [remote], collections: [executeB] });
    expect(
      await refreshCatalog('de_mirage', async () => {
        throw new Error('offline');
      }),
    ).toBeNull();
    expect((await loadOfflineCatalog('de_mirage')).collections).toHaveLength(1);
  });
});

describe('loadBuiltIns', () => {
  it('stores the API copy, then serves it offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ map: 'de_mirage', revision: 3, lineups: [remote] })),
    );

    const online = await loadBuiltIns('de_mirage');
    expect(online.map((lineup) => lineup.id)).toEqual(['api-1']);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );
    expect((await loadBuiltIns('de_mirage')).map((lineup) => lineup.id)).toEqual(['api-1']);
    expect((await loadOfflineBuiltIns('de_mirage')).map((lineup) => lineup.id)).toEqual(['api-1']);
  });

  it('falls back to the bundled snapshot when nothing is stored and the API is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );
    expect(await loadBuiltIns('de_inferno')).toEqual([]);
    const mirage = await loadOfflineBuiltIns('de_mirage');
    expect(mirage.length).toBeGreaterThan(0);
  });
});

describe('syncBuiltIns', () => {
  const summary = (maps: { map: string; revision: number; count?: number }[]) =>
    Response.json({ maps: maps.map((entry) => ({ count: 1, ...entry })) });

  function serve(maps: { map: string; revision: number }[], bodies: Record<string, Lineup[]> = {}) {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      if (url.endsWith('/lineups')) return summary(maps);
      const map = decodeURIComponent(url.split('/').pop() ?? '');
      const revision = maps.find((entry) => entry.map === map)?.revision ?? 0;
      return Response.json({ map, revision, lineups: bodies[map] ?? [] });
    };
    return { calls, fetchImpl };
  }

  it('fetches a map that has no stored copy or a stale one, and leaves a current one alone', async () => {
    stored.set('de_nuke', { revision: 2, lineups: [] });
    stored.set('de_dust2', { revision: 5, lineups: [] });
    const { calls, fetchImpl } = serve(
      [
        { map: 'de_mirage', revision: 3 },
        { map: 'de_nuke', revision: 3 },
        { map: 'de_dust2', revision: 5 },
        { map: 'de_inferno', revision: 0 },
      ],
      { de_mirage: [remote] },
    );

    const changed = await syncBuiltIns(
      ['de_mirage', 'de_nuke', 'de_dust2', 'de_inferno', 'de_train'],
      fetchImpl,
    );

    expect([...changed].sort()).toEqual(['de_mirage', 'de_nuke']);
    expect(calls.filter((url) => !url.endsWith('/lineups')).length).toBe(2);
    expect((await loadOfflineBuiltIns('de_mirage')).map((lineup) => lineup.id)).toEqual(['api-1']);
    expect(stored.get('de_nuke')).toMatchObject({ revision: 3 });
  });

  it('does nothing offline or on a bad summary', async () => {
    expect(
      await syncBuiltIns(['de_mirage'], async () => {
        throw new Error('offline');
      }),
    ).toEqual([]);
    expect(await syncBuiltIns(['de_mirage'], async () => Response.json({ maps: 1 }))).toEqual([]);
    expect(
      await syncBuiltIns(['de_mirage'], async () => new Response('no', { status: 500 })),
    ).toEqual([]);
    expect(stored.size).toBe(0);
  });

  it('keeps the stored copy when the map itself cannot be fetched', async () => {
    stored.set('de_mirage', { revision: 1, lineups: [remote] });
    const fetchImpl = async (url: string) =>
      url.endsWith('/lineups')
        ? summary([{ map: 'de_mirage', revision: 2 }])
        : new Response('no', { status: 500 });

    expect(await syncBuiltIns(['de_mirage'], fetchImpl)).toEqual([]);
    expect(stored.get('de_mirage')).toMatchObject({ revision: 1 });
  });
});
