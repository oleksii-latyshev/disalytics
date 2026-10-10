import type { Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { copiedTactic } from '../helpers/tactic-copy';

const source: Tactic = {
  id: 'built-in-1',
  title: 'B split',
  map: 'de_mirage',
  side: 'T',
  author: 'Ann',
  spawns: [],
  plans: [
    {
      id: 'main',
      condition: 'Main',
      parentId: null,
      forkAfter: 0,
      deaths: {},
      steps: [{ id: 'step-1', name: 'Go', startsAt: null, players: [], throws: [], drawings: [] }],
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

describe('copiedTactic', () => {
  it('is the reader’s own: a new id, new step ids, the time it was made, the same content', () => {
    const copy = copiedTactic(source);

    expect(copy.id).not.toBe(source.id);
    expect(copy.plans[0]?.steps[0]?.id).not.toBe('step-1');
    expect(copy.createdAt).toBeGreaterThan(1);
    expect(copy).toMatchObject({ title: 'B split', author: 'Ann', map: 'de_mirage', side: 'T' });
    expect(source.id).toBe('built-in-1');
  });

  it('takes a title when given one', () => {
    expect(copiedTactic(source, 'B split (copy)').title).toBe('B split (copy)');
  });
});
