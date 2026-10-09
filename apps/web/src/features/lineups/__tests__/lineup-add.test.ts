import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  addStep,
  joinPlan,
  newLineup,
  placePoint,
  redoPoint,
  startAdd,
  startAnother,
  stepNumber,
  suggestedTitle,
  titleOf,
} from '../helpers/lineup-add';
import { lineupTargets } from '../helpers/lineup-targets';

const here = { x: -1000, y: -1000, z: 0 };
const there = { x: 500, y: 700, z: 0 };

const saved = (id: string, patch: Partial<Lineup> = {}): Lineup => ({
  id,
  title: id,
  map: 'de_mirage',
  side: 'CT',
  kind: 'flash',
  origin: there,
  landing: here,
  pitch: 0,
  yaw: 0,
  throwType: 'stand',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  ...patch,
});

describe('the add flow', () => {
  it('asks for the landing, then the throw spot, then the details', () => {
    const start = startAdd('all', 'ALL');
    expect(addStep(start)).toBe('land');

    const landed = placePoint(start, here);
    expect(addStep(landed)).toBe('origin');

    const placed = placePoint(landed, there);
    expect(addStep(placed)).toBe('details');
    expect([start, landed, placed].map((draft) => stepNumber(addStep(draft)))).toEqual([1, 2, 3]);
  });

  it('starts from the kind and side the reader is looking at', () => {
    expect(startAdd('flash', 'CT')).toMatchObject({ kind: 'flash', side: 'CT' });
    expect(startAdd('all', 'ALL')).toMatchObject({ kind: 'smoke', side: 'T' });
  });

  it('ignores a press once both points are placed', () => {
    const placed = placePoint(placePoint(startAdd('all', 'T'), here), there);

    expect(placePoint(placed, { x: 1, y: 2, z: 0 })).toBe(placed);
  });

  it('takes a point back to place it again, but never a landing that belongs to a target', () => {
    const placed = placePoint(placePoint(startAdd('all', 'T'), here), there);

    expect(addStep(redoPoint(placed, 'origin'))).toBe('origin');
    expect(addStep(redoPoint(placed, 'landing'))).toBe('land');

    const [target] = lineupTargets('de_mirage', [saved('a')]);
    if (target === undefined) throw new Error('one target');
    const another = placePoint(startAnother(target, 'CT'), there);

    expect(redoPoint(another, 'landing')).toBe(another);
  });

  it('starts another position at the second step with the landing fixed', () => {
    const [target] = lineupTargets('de_mirage', [saved('a')]);
    if (target === undefined) throw new Error('one target');

    const draft = startAnother(target, 'CT');

    expect(addStep(draft)).toBe('origin');
    expect(draft).toMatchObject({ kind: 'flash', side: 'CT', landing: here });
  });
});

describe('the title', () => {
  it('is the kind and where it lands until the reader writes one', () => {
    const draft = placePoint(startAdd('smoke', 'T'), here);

    expect(suggestedTitle('de_mirage', draft)).toMatch(/^Smoke( .+)?$/);
    expect(titleOf('de_mirage', draft)).toBe(suggestedTitle('de_mirage', draft));
    expect(titleOf('de_mirage', { ...draft, title: 'My smoke' })).toBe('My smoke');
  });

  it('is only the kind where nothing is placed yet', () => {
    expect(suggestedTitle('de_mirage', startAdd('flash', 'T'))).toBe('Flash');
  });
});

describe('newLineup', () => {
  const draft = {
    ...placePoint(placePoint(startAdd('smoke', 'T'), here), there),
    throwType: 'crouch' as const,
    notes: '  left of the corner ',
    title: 'Corner smoke',
  };

  it('is null until both points are placed', () => {
    expect(
      newLineup({
        map: 'de_mirage',
        draft: startAdd('smoke', 'T'),
        imageUrls: [],
        id: 'x',
        now: 5,
      }),
    ).toBeNull();
  });

  it('carries what the flow collected and the keys that go with the throw', () => {
    const lineup = newLineup({
      map: 'de_mirage',
      draft,
      imageUrls: [`local:${'a'.repeat(64)}`],
      id: 'new-1',
      now: 99,
    });

    expect(lineup).toMatchObject({
      id: 'new-1',
      title: 'Corner smoke',
      map: 'de_mirage',
      kind: 'smoke',
      side: 'T',
      throwType: 'crouch',
      movementKeys: ['Ctrl'],
      notes: 'left of the corner',
      createdAt: 99,
      isBuiltIn: false,
      command: '',
    });
    expect(lineup?.landing.x).toBeCloseTo(here.x, 1);
    expect(lineup?.origin.y).toBeCloseTo(there.y, 1);
    expect(lineup?.imageUrls).toHaveLength(1);
  });

  it('joins a group as a landing group', () => {
    const lineup = newLineup({
      map: 'de_mirage',
      draft,
      imageUrls: [],
      id: 'n',
      now: 1,
      groupId: 'g',
    });

    expect(lineup).toMatchObject({ groupId: 'g' });
  });
});

describe('joinPlan', () => {
  it('puts the members of an ungrouped target in a new group, except built-ins', () => {
    const [target] = lineupTargets('de_mirage', [
      saved('a'),
      saved('b', { isBuiltIn: true, createdAt: 2 }),
    ]);
    if (target === undefined) throw new Error('one target');

    const plan = joinPlan(target, 'fresh');

    expect(plan.groupId).toBe('fresh');
    expect(plan.regrouped.map(({ id, groupId }) => [id, groupId])).toEqual([['a', 'fresh']]);
  });

  it('joins the group the target already has', () => {
    const [target] = lineupTargets('de_mirage', [
      saved('a', { groupId: 'old' }),
      saved('b', { createdAt: 2 }),
    ]);
    if (target === undefined) throw new Error('one target');

    const plan = joinPlan(target, 'fresh');

    expect(plan.groupId).toBe('old');
    expect(plan.regrouped.map(({ id }) => id)).toEqual(['b']);
  });
});
