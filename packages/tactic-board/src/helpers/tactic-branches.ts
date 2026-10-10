import {
  addPlan,
  effectiveSteps,
  ownerOf,
  planById,
  type Tactic,
  type TacticPlan,
  type TacticStep,
} from '@disa/demo-core';
import { newStep } from './tactic-edits';
import { generateId } from './tactic-ids';

export interface BranchRequest {
  /** The plan in view and the effective step the branch is made from. */
  readonly planId: string;
  readonly stepIndex: number;
  /** A player who dies at this step: the branch leaves one step earlier and starts here without them. */
  readonly deadSlot: number | null;
  readonly condition: string;
}

export interface BranchResult {
  readonly tactic: Tactic;
  readonly planId: string;
  /** Effective index of the branch's first own step. */
  readonly stepIndex: number;
}

/** A step with fresh ids, so the copy and the original can be edited apart. */
export function copyStep(step: TacticStep): TacticStep {
  return {
    ...step,
    id: generateId('step'),
    throws: step.throws.map((thrown) => ({ ...thrown, id: generateId('throw') })),
    enemies: step.enemies?.map((enemy) => ({ ...enemy, id: generateId('enemy') })),
    drawings: step.drawings?.map((stroke) => ({ ...stroke, id: generateId('stroke') })),
  };
}

/** The step as it plays out without a player: no route, no grenades, no dropped grenade to them. */
export function withoutPlayer(step: TacticStep, slot: number): TacticStep {
  return {
    ...step,
    players: step.players.filter((player) => player.slot !== slot),
    throws: step.throws
      .filter((thrown) => thrown.throwerSlot !== slot)
      .map((thrown) => (thrown.droppedBy === slot ? { ...thrown, droppedBy: undefined } : thrown)),
  };
}

/**
 * Adds a branch after a step (or, for a death, one step earlier so it replaces the step the player
 * dies in). The branch hangs from the plan that stores the step it leaves, starts with a copy of
 * what plays next there — an empty step when nothing does — and takes the player out from its first
 * step on. Null when there is nothing to leave from.
 */
export function createBranch(
  tactic: Tactic,
  request: BranchRequest,
  slotCount: number,
): BranchResult | null {
  const { planId, stepIndex, deadSlot, condition } = request;
  const steps = effectiveSteps(tactic, planId);
  const forkAfter = deadSlot === null ? stepIndex : stepIndex - 1;
  if (forkAfter < 0 || steps[forkAfter] === undefined) return null;

  const parent = ownerOf(tactic, planId, forkAfter);
  if (parent === null) return null;

  const ahead = steps[forkAfter + 1];
  const seed = ahead === undefined ? newStep(slotCount) : copyStep(ahead);
  const first = deadSlot === null ? seed : withoutPlayer(seed, deadSlot);

  const plan: TacticPlan = {
    id: generateId('plan'),
    condition,
    parentId: parent.planId,
    forkAfter,
    deaths: deadSlot === null ? {} : { [deadSlot]: forkAfter + 1 },
    steps: [first],
  };
  const next = addPlan(tactic, plan);
  if (next === tactic) return null;
  return { tactic: next, planId: plan.id, stepIndex: forkAfter + 1 };
}

export function setCondition(tactic: Tactic, planId: string, condition: string): Tactic {
  if (planById(tactic, planId)?.condition === condition) return tactic;
  return {
    ...tactic,
    plans: tactic.plans.map((plan) => (plan.id === planId ? { ...plan, condition } : plan)),
  };
}

/** The nearest plan that survives in `tactic`: the plan itself, else the closest ancestor `before` knew of. */
export function survivingPlanId(before: Tactic, tactic: Tactic, planId: string): string | null {
  for (let plan = planById(before, planId); plan !== undefined; ) {
    if (planById(tactic, plan.id) !== undefined) return plan.id;
    plan = plan.parentId === null ? undefined : planById(before, plan.parentId);
  }
  return planById(tactic, planId)?.id ?? null;
}
