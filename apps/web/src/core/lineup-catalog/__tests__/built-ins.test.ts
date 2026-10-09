import type { Lineup } from '@disa/demo-core';
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

import { fetchBuiltIns, loadBuiltIns, loadOfflineBuiltIns } from '../helpers/built-ins';

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

    expect(result).toEqual({ revision: 2, lineups: [{ ...remote, isBuiltIn: true }] });
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
