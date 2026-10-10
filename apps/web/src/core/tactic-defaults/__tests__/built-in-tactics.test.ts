import type { Tactic } from '@disa/demo-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stored = vi.hoisted(() => ({ copy: null as unknown }));

vi.mock('@disa/demo-store', () => ({
  openBuiltInTacticStore: async () => ({
    get: async () => stored.copy,
    put: async (copy: unknown) => {
      stored.copy = copy;
    },
    close: () => {},
  }),
}));

import {
  fetchBuiltInTactics,
  loadOfflineTactics,
  refreshBuiltInTactics,
  visibleBuiltIns,
} from '../helpers/built-in-tactics';
import { defaultTactics } from '../helpers/default-tactics';

const remote: Tactic = {
  id: 'api-1',
  title: 'From the API',
  map: 'de_mirage',
  side: 'T',
  spawns: [],
  plans: [
    {
      id: 'main',
      condition: 'Main',
      parentId: null,
      forkAfter: 0,
      deaths: {},
      steps: [{ id: 's', name: 'Go', startsAt: null, players: [], throws: [], drawings: [] }],
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

afterEach(() => {
  stored.copy = null;
});

describe('fetchBuiltInTactics', () => {
  it('keeps the valid tactics and drops the rest', async () => {
    const result = await fetchBuiltInTactics(async () =>
      Response.json({ revision: 3, tactics: [remote, { id: 'bad' }, 'x'] }),
    );
    expect(result).toEqual({ revision: 3, tactics: [remote] });
  });

  it('is null for an unseeded API, a bad answer, an error status and a network failure', async () => {
    expect(
      await fetchBuiltInTactics(async () => Response.json({ revision: 0, tactics: [] })),
    ).toBeNull();
    expect(await fetchBuiltInTactics(async () => Response.json({ revision: 1 }))).toBeNull();
    expect(await fetchBuiltInTactics(async () => new Response('x', { status: 500 }))).toBeNull();
    expect(
      await fetchBuiltInTactics(async () => {
        throw new Error('offline');
      }),
    ).toBeNull();
  });

  it('serves an API that holds no tactics any more as empty, not as unseeded', async () => {
    expect(
      await fetchBuiltInTactics(async () => Response.json({ revision: 4, tactics: [] })),
    ).toEqual({ revision: 4, tactics: [] });
  });
});

describe('the device copy', () => {
  it('falls back to the bundled tactics when nothing was ever stored', async () => {
    expect((await loadOfflineTactics()).map(({ id }) => id)).toEqual(
      defaultTactics().map(({ id }) => id),
    );
  });

  it('keeps the API copy on refresh and reads it back offline', async () => {
    const fresh = await refreshBuiltInTactics(async () =>
      Response.json({ revision: 2, tactics: [remote] }),
    );
    expect(fresh).toEqual([remote]);
    expect(stored.copy).toEqual({ revision: 2, tactics: [remote] });
    expect(await loadOfflineTactics()).toEqual([remote]);
  });

  it('leaves the stored copy alone when the API cannot be reached', async () => {
    stored.copy = { revision: 2, tactics: [remote] };
    const failed = await refreshBuiltInTactics(async () => new Response('x', { status: 503 }));
    expect(failed).toBeNull();
    expect(await loadOfflineTactics()).toEqual([remote]);
  });
});

describe('visibleBuiltIns', () => {
  it('hides a built-in the reader already holds under the same id and keeps the rest', () => {
    const other: Tactic = { ...remote, id: 'api-2' };
    const mine: Tactic = { ...remote, title: 'Edited by me' };
    expect(visibleBuiltIns([remote, other], [mine]).map(({ id }) => id)).toEqual(['api-2']);
    expect(visibleBuiltIns([remote, other], [])).toEqual([remote, other]);
  });
});
