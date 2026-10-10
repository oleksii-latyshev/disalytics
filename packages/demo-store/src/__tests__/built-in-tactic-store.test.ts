import 'fake-indexeddb/auto';
import type { Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { openBuiltInTacticStore } from '../built-in-tactic-store';

const tactic: Tactic = {
  id: 'mirage-b',
  title: 'B split',
  map: 'de_mirage',
  side: 'T',
  spawns: [],
  plans: [
    {
      id: 'main',
      condition: 'B split',
      parentId: null,
      forkAfter: 0,
      deaths: {},
      steps: [{ id: 's', name: 'Go', startsAt: null, players: [], throws: [], drawings: [] }],
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

describe('built-in tactic store', () => {
  it('keeps the last copy and returns null before any', async () => {
    const store = await openBuiltInTacticStore();
    if (store === null) throw new Error('fake-indexeddb should open');

    expect(await store.get()).toBeNull();
    await store.put({ revision: 1, tactics: [tactic] });
    await store.put({ revision: 2, tactics: [tactic, { ...tactic, id: 'two' }] });

    const copy = await store.get();
    expect(copy?.revision).toBe(2);
    expect(copy?.tactics.map(({ id }) => id)).toEqual(['mirage-b', 'two']);
    store.close();
  });
});
