import { describe, expect, it } from 'vitest';
import {
  addPlan,
  canRemoveStep,
  deadAt,
  effectiveSteps,
  insertStep,
  ownerOf,
  removePlan,
  removeStep,
  updateStepIn,
} from '../helpers/tactic-plans';
import type { Tactic, TacticPlan, TacticStep } from '../helpers/tactics';

function step(id: string): TacticStep {
  return { id, name: id, startsAt: null, players: [], throws: [] };
}

function plan(
  id: string,
  parentId: string | null,
  forkAfter: number,
  steps: readonly string[],
  deaths: Record<number, number> = {},
): TacticPlan {
  return { id, condition: id, parentId, forkAfter, deaths, steps: steps.map(step) };
}

function tacticOf(...plans: TacticPlan[]): Tactic {
  return {
    id: 't',
    title: 't',
    map: 'de_dust2',
    side: 'T',
    createdAt: 0,
    updatedAt: 0,
    spawns: [],
    plans,
  };
}

const ids = (steps: readonly TacticStep[]) => steps.map((entry) => entry.id);

/*
 * main:  m0 m1 m2 m3
 * b:     forks after m1 (index 1):  b0 b1            => m0 m1 b0 b1
 * c:     forks after b0 (index 2) of b: c0           => m0 m1 b0 c0
 * d:     forks after m3 (index 3) of main: d0        => m0 m1 m2 m3 d0
 */
function tree(): Tactic {
  return tacticOf(
    plan('main', null, 0, ['m0', 'm1', 'm2', 'm3'], { 2: 3 }),
    plan('b', 'main', 1, ['b0', 'b1'], { 1: 2 }),
    plan('c', 'b', 2, ['c0']),
    plan('d', 'main', 3, ['d0']),
  );
}

describe('effectiveSteps', () => {
  it('is a root plan own steps', () => {
    expect(ids(effectiveSteps(tree(), 'main'))).toEqual(['m0', 'm1', 'm2', 'm3']);
  });

  it('is the parent up to the fork, then its own', () => {
    expect(ids(effectiveSteps(tree(), 'b'))).toEqual(['m0', 'm1', 'b0', 'b1']);
    expect(ids(effectiveSteps(tree(), 'd'))).toEqual(['m0', 'm1', 'm2', 'm3', 'd0']);
  });

  it('follows a chain of branches', () => {
    expect(ids(effectiveSteps(tree(), 'c'))).toEqual(['m0', 'm1', 'b0', 'c0']);
  });

  it('is empty for an unknown plan', () => {
    expect(effectiveSteps(tree(), 'ghost')).toEqual([]);
  });
});

describe('deadAt', () => {
  it('reads a plan own deaths', () => {
    expect(deadAt(tree(), 'main')).toEqual({ 2: 3 });
  });

  it('inherits a parent death only when it happened at or before the fork', () => {
    const t = tacticOf(
      plan('main', null, 0, ['m0', 'm1', 'm2'], { 1: 0, 2: 2 }),
      plan('b', 'main', 1, ['b0']),
    );
    expect(deadAt(t, 'b')).toEqual({ 1: 0 });
  });

  it('lets a branch override and extend what it inherits', () => {
    const t = tacticOf(
      plan('main', null, 0, ['m0', 'm1', 'm2'], { 1: 0 }),
      plan('b', 'main', 1, ['b0'], { 1: 1, 3: 2 }),
    );
    expect(deadAt(t, 'b')).toEqual({ 1: 1, 3: 2 });
  });

  it('collects along a whole chain', () => {
    expect(deadAt(tree(), 'c')).toEqual({ 1: 2 });
  });
});

describe('ownerOf', () => {
  it('names the plan that stores each step of an effective list', () => {
    const t = tree();
    expect(ownerOf(t, 'main', 3)).toEqual({ planId: 'main', localIndex: 3 });
    expect(ownerOf(t, 'b', 0)).toEqual({ planId: 'main', localIndex: 0 });
    expect(ownerOf(t, 'b', 1)).toEqual({ planId: 'main', localIndex: 1 });
    expect(ownerOf(t, 'b', 2)).toEqual({ planId: 'b', localIndex: 0 });
    expect(ownerOf(t, 'b', 3)).toEqual({ planId: 'b', localIndex: 1 });
  });

  it('walks up through every shared prefix', () => {
    const t = tree();
    expect(ownerOf(t, 'c', 1)).toEqual({ planId: 'main', localIndex: 1 });
    expect(ownerOf(t, 'c', 2)).toEqual({ planId: 'b', localIndex: 0 });
    expect(ownerOf(t, 'c', 3)).toEqual({ planId: 'c', localIndex: 0 });
  });

  it('is null past the end or for an unknown plan', () => {
    expect(ownerOf(tree(), 'b', 4)).toBeNull();
    expect(ownerOf(tree(), 'b', -1)).toBeNull();
    expect(ownerOf(tree(), 'ghost', 0)).toBeNull();
  });
});

describe('updateStepIn', () => {
  it('writes a shared step into the plan that owns it, for every plan that shares it', () => {
    const next = updateStepIn(tree(), 'b', 0, (entry) => ({ ...entry, name: 'renamed' }));
    expect(effectiveSteps(next, 'main')[0]?.name).toBe('renamed');
    expect(effectiveSteps(next, 'c')[0]?.name).toBe('renamed');
    expect(effectiveSteps(next, 'b')[2]?.name).toBe('b0');
  });

  it('writes a branch own step into the branch only', () => {
    const next = updateStepIn(tree(), 'b', 2, (entry) => ({ ...entry, name: 'mine' }));
    expect(effectiveSteps(next, 'b')[2]?.name).toBe('mine');
    expect(effectiveSteps(next, 'main').map((entry) => entry.name)).toEqual([
      'm0',
      'm1',
      'm2',
      'm3',
    ]);
  });

  it('leaves the tactic alone for a missing step', () => {
    const t = tree();
    expect(updateStepIn(t, 'b', 9, (entry) => entry)).toBe(t);
  });
});

describe('insertStep', () => {
  it('inserts into a branch own steps and leaves the parent', () => {
    const next = insertStep(tree(), 'b', 3, step('x'));
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m0', 'm1', 'b0', 'x', 'b1']);
    expect(ids(effectiveSteps(next, 'main'))).toEqual(['m0', 'm1', 'm2', 'm3']);
  });

  it('inserts at a branch start without touching the parent either', () => {
    const next = insertStep(tree(), 'b', 2, step('x'));
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m0', 'm1', 'x', 'b0', 'b1']);
    expect(ids(effectiveSteps(next, 'main'))).toEqual(['m0', 'm1', 'm2', 'm3']);
  });

  it('inserting inside the shared prefix reaches the parent and keeps each fork after its step', () => {
    const next = insertStep(tree(), 'b', 1, step('x'));
    expect(ids(effectiveSteps(next, 'main'))).toEqual(['m0', 'x', 'm1', 'm2', 'm3']);
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m0', 'x', 'm1', 'b0', 'b1']);
    expect(ids(effectiveSteps(next, 'c'))).toEqual(['m0', 'x', 'm1', 'b0', 'c0']);
    expect(ids(effectiveSteps(next, 'd'))).toEqual(['m0', 'x', 'm1', 'm2', 'm3', 'd0']);
  });

  it('shifts deaths with the steps they point at', () => {
    const next = insertStep(tree(), 'b', 1, step('x'));
    expect(deadAt(next, 'main')).toEqual({ 2: 4 });
    expect(deadAt(next, 'b')).toEqual({ 1: 3 });
  });

  it('inserting right after the fork step belongs to the parent alone', () => {
    const next = insertStep(tree(), 'main', 2, step('x'));
    expect(ids(effectiveSteps(next, 'main'))).toEqual(['m0', 'm1', 'x', 'm2', 'm3']);
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m0', 'm1', 'b0', 'b1']);
    expect(ids(effectiveSteps(next, 'd'))).toEqual(['m0', 'm1', 'x', 'm2', 'm3', 'd0']);
  });

  it('appends at the end of a plan and clamps an index past it', () => {
    const next = insertStep(tree(), 'c', 99, step('x'));
    expect(ids(effectiveSteps(next, 'c'))).toEqual(['m0', 'm1', 'b0', 'c0', 'x']);
  });

  it('keeps every fork valid', () => {
    const next = insertStep(tree(), 'c', 0, step('x'));
    for (const entry of next.plans) {
      if (entry.parentId === null) continue;
      expect(entry.forkAfter).toBeLessThan(effectiveSteps(next, entry.parentId).length);
    }
  });
});

describe('removeStep', () => {
  it('removes a branch own step', () => {
    const next = removeStep(tree(), 'b', 3);
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m0', 'm1', 'b0']);
    expect(ids(effectiveSteps(next, 'main'))).toEqual(['m0', 'm1', 'm2', 'm3']);
  });

  it('removing a step before a fork moves the fork and the death indices', () => {
    const next = removeStep(tree(), 'main', 0);
    expect(ids(effectiveSteps(next, 'main'))).toEqual(['m1', 'm2', 'm3']);
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m1', 'b0', 'b1']);
    expect(ids(effectiveSteps(next, 'c'))).toEqual(['m1', 'b0', 'c0']);
    expect(ids(effectiveSteps(next, 'd'))).toEqual(['m1', 'm2', 'm3', 'd0']);
    expect(deadAt(next, 'main')).toEqual({ 2: 2 });
    expect(deadAt(next, 'b')).toEqual({ 1: 1 });
  });

  it('removing a step after a fork leaves that branch alone', () => {
    const next = removeStep(tree(), 'main', 2);
    expect(ids(effectiveSteps(next, 'b'))).toEqual(['m0', 'm1', 'b0', 'b1']);
    expect(ids(effectiveSteps(next, 'd'))).toEqual(['m0', 'm1', 'm3', 'd0']);
  });

  it('refuses a step a branch leaves after, however deep', () => {
    const t = tree();
    expect(canRemoveStep(t, 'main', 1)).toEqual({ ok: false, reason: 'fork-point' });
    expect(canRemoveStep(t, 'main', 3)).toEqual({ ok: false, reason: 'fork-point' });
    expect(canRemoveStep(t, 'b', 2)).toEqual({ ok: false, reason: 'fork-point' });
    expect(removeStep(t, 'main', 1)).toBe(t);
  });

  it('refuses a plan only step and a missing step', () => {
    const solo = tacticOf(plan('main', null, 0, ['m0']));
    expect(canRemoveStep(solo, 'main', 0)).toEqual({ ok: false, reason: 'only-step' });
    expect(canRemoveStep(solo, 'main', 4)).toEqual({ ok: false, reason: 'missing' });
    expect(canRemoveStep(tree(), 'c', 3)).toEqual({ ok: false, reason: 'only-step' });
  });

  it('allows what no branch depends on', () => {
    expect(canRemoveStep(tree(), 'main', 0)).toEqual({ ok: true });
    expect(canRemoveStep(tree(), 'b', 3)).toEqual({ ok: true });
  });

  it('inserting then removing returns the original steps', () => {
    const t = tree();
    const round = removeStep(insertStep(t, 'b', 0, step('x')), 'b', 0);
    expect(round.plans.map((entry) => [entry.id, entry.forkAfter, entry.deaths])).toEqual(
      t.plans.map((entry) => [entry.id, entry.forkAfter, entry.deaths]),
    );
    expect(ids(effectiveSteps(round, 'c'))).toEqual(ids(effectiveSteps(t, 'c')));
  });
});

describe('addPlan', () => {
  it('adds a branch at a real fork', () => {
    const next = addPlan(tree(), plan('e', 'c', 3, ['e0']));
    expect(ids(effectiveSteps(next, 'e'))).toEqual(['m0', 'm1', 'b0', 'c0', 'e0']);
  });

  it('refuses a second root, a duplicate id, a missing parent and a fork off the end', () => {
    const t = tree();
    expect(addPlan(t, plan('e', null, 0, ['e0']))).toBe(t);
    expect(addPlan(t, plan('b', 'main', 0, ['e0']))).toBe(t);
    expect(addPlan(t, plan('e', 'ghost', 0, ['e0']))).toBe(t);
    expect(addPlan(t, plan('e', 'main', 4, ['e0']))).toBe(t);
    expect(addPlan(t, plan('e', 'main', -1, ['e0']))).toBe(t);
  });
});

describe('removePlan', () => {
  it('removes a branch and everything below it', () => {
    const next = removePlan(tree(), 'b');
    expect(next.plans.map((entry) => entry.id)).toEqual(['main', 'd']);
  });

  it('removes a leaf only', () => {
    expect(removePlan(tree(), 'c').plans.map((entry) => entry.id)).toEqual(['main', 'b', 'd']);
  });

  it('never removes the root or an unknown plan', () => {
    const t = tree();
    expect(removePlan(t, 'main')).toBe(t);
    expect(removePlan(t, 'ghost')).toBe(t);
  });
});
