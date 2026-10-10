import { deadAt, effectiveSteps, type Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { createBranch, setCondition, survivingPlanId } from '../helpers/tactic-branches';
import { addStepAfter, addThrow, addWaypoint, renameStep } from '../helpers/tactic-edits';
import { createNewTactic } from '../helpers/tactic-setup';

function threeSteps(): { tactic: Tactic; rootId: string } {
  let tactic = createNewTactic('de_mirage', 'T');
  const rootId = tactic.plans[0]?.id ?? '';
  tactic = addStepAfter(tactic, rootId, 0, 5);
  tactic = addStepAfter(tactic, rootId, 1, 5);
  ['one', 'two', 'three'].forEach((name, stepIndex) => {
    tactic = renameStep(tactic, { planId: rootId, stepIndex }, name);
  });
  return { tactic, rootId };
}

describe('createBranch', () => {
  it('copies the next step into a branch that leaves after the step', () => {
    const { tactic, rootId } = threeSteps();
    const made = createBranch(
      tactic,
      { planId: rootId, stepIndex: 0, deadSlot: null, condition: 'If CT push mid' },
      5,
    );
    expect(made).not.toBeNull();
    if (made === null) return;
    const plan = made.tactic.plans.find((entry) => entry.id === made.planId);
    expect(plan?.parentId).toBe(rootId);
    expect(plan?.forkAfter).toBe(0);
    expect(plan?.condition).toBe('If CT push mid');
    expect(made.stepIndex).toBe(1);
    const steps = effectiveSteps(made.tactic, made.planId);
    expect(steps.map((step) => step.name)).toEqual(['one', 'two']);
    expect(steps[1]?.id).not.toBe(effectiveSteps(tactic, rootId)[1]?.id);
  });

  it('starts with an empty step when nothing follows the fork', () => {
    const { tactic, rootId } = threeSteps();
    const made = createBranch(
      tactic,
      { planId: rootId, stepIndex: 2, deadSlot: null, condition: '' },
      5,
    );
    const steps = made === null ? [] : effectiveSteps(made.tactic, made.planId);
    expect(steps).toHaveLength(4);
    expect(steps[3]?.name).toBe('');
    expect(steps[3]?.players.every((player) => player.route.points.length === 0)).toBe(true);
  });

  it('leaves one step earlier for a death and takes the player out from the step', () => {
    let { tactic, rootId } = threeSteps();
    tactic = addWaypoint(tactic, { planId: rootId, stepIndex: 1 }, 2, { x: 1, y: 1 });
    tactic = addThrow(
      tactic,
      { planId: rootId, stepIndex: 1 },
      {
        id: 't1',
        throwerSlot: 2,
        kind: 'smoke',
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 },
        releaseTime: 0,
      },
    );
    const made = createBranch(
      tactic,
      { planId: rootId, stepIndex: 1, deadSlot: 2, condition: 'If player 3 dies' },
      5,
    );
    expect(made).not.toBeNull();
    if (made === null) return;
    const plan = made.tactic.plans.find((entry) => entry.id === made.planId);
    expect(plan?.forkAfter).toBe(0);
    expect(plan?.deaths).toEqual({ 2: 1 });
    expect(deadAt(made.tactic, made.planId)).toEqual({ 2: 1 });
    const first = effectiveSteps(made.tactic, made.planId)[1];
    expect(first?.players.some((player) => player.slot === 2)).toBe(false);
    expect(first?.throws).toHaveLength(0);
    expect(effectiveSteps(made.tactic, rootId)[1]?.throws).toHaveLength(1);
  });

  it('refuses a death branch on the first step', () => {
    const { tactic, rootId } = threeSteps();
    expect(
      createBranch(tactic, { planId: rootId, stepIndex: 0, deadSlot: 1, condition: '' }, 5),
    ).toBeNull();
  });

  it('hangs a branch of a branch from the plan that stores the step', () => {
    const { tactic, rootId } = threeSteps();
    const first = createBranch(
      tactic,
      { planId: rootId, stepIndex: 0, deadSlot: null, condition: 'a' },
      5,
    );
    if (first === null) return;
    const second = createBranch(
      first.tactic,
      { planId: first.planId, stepIndex: 1, deadSlot: null, condition: 'b' },
      5,
    );
    const plan = second?.tactic.plans.find((entry) => entry.id === second.planId);
    expect(plan?.parentId).toBe(first.planId);
    expect(plan?.forkAfter).toBe(1);

    const sibling = createBranch(
      first.tactic,
      { planId: first.planId, stepIndex: 0, deadSlot: null, condition: 'c' },
      5,
    );
    const siblingPlan = sibling?.tactic.plans.find((entry) => entry.id === sibling.planId);
    expect(siblingPlan?.parentId).toBe(rootId);
  });
});

describe('setCondition and survivingPlanId', () => {
  it('changes only the condition and leaves an identical text alone', () => {
    const { tactic, rootId } = threeSteps();
    expect(setCondition(tactic, rootId, tactic.plans[0]?.condition ?? '')).toBe(tactic);
    expect(setCondition(tactic, rootId, 'x').plans[0]?.condition).toBe('x');
  });

  it('falls back to the nearest ancestor that is still there', () => {
    const { tactic, rootId } = threeSteps();
    const made = createBranch(
      tactic,
      { planId: rootId, stepIndex: 0, deadSlot: null, condition: '' },
      5,
    );
    if (made === null) return;
    expect(survivingPlanId(made.tactic, tactic, made.planId)).toBe(rootId);
    expect(survivingPlanId(made.tactic, made.tactic, made.planId)).toBe(made.planId);
  });
});
