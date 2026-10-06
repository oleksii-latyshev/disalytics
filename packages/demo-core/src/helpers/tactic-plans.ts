import type { Tactic, TacticPlan, TacticStep } from './tactics';

/**
 * Plans form a tree. A branch holds only the steps after its fork; the steps up to the fork are its
 * parent's, so its *effective* steps are the parent's up to `forkAfter`, then its own. Step indices
 * in these helpers are always effective indices of the plan named, and an index inside the shared
 * prefix is the same step in every plan that shares it.
 */

export function planById(tactic: Tactic, planId: string): TacticPlan | undefined {
  return tactic.plans.find((plan) => plan.id === planId);
}

export function rootPlan(tactic: Tactic): TacticPlan | undefined {
  return tactic.plans.find((plan) => plan.parentId === null);
}

export function childPlans(tactic: Tactic, planId: string): readonly TacticPlan[] {
  return tactic.plans.filter((plan) => plan.parentId === planId);
}

/** The plan and every plan below it, the plan first. */
export function planSubtree(tactic: Tactic, planId: string): readonly TacticPlan[] {
  const plan = planById(tactic, planId);
  if (plan === undefined) return [];
  return [plan, ...childPlans(tactic, planId).flatMap((child) => planSubtree(tactic, child.id))];
}

/** The steps a plan plays: its parent's up to the fork, then its own. Empty for an unknown plan. */
export function effectiveSteps(tactic: Tactic, planId: string): readonly TacticStep[] {
  const plan = planById(tactic, planId);
  if (plan === undefined) return [];
  if (plan.parentId === null) return plan.steps;
  return [...effectiveSteps(tactic, plan.parentId).slice(0, plan.forkAfter + 1), ...plan.steps];
}

/** The main plan's steps — what a tactic shows when no branch is chosen. */
export function mainSteps(tactic: Tactic): readonly TacticStep[] {
  const root = rootPlan(tactic);
  return root === undefined ? [] : effectiveSteps(tactic, root.id);
}

/**
 * From which effective step each player is dead in a plan, by slot. A parent's deaths count only up
 * to the fork the plan leaves at; a plan's own deaths override what it inherits.
 */
export function deadAt(tactic: Tactic, planId: string): Readonly<Record<number, number>> {
  const chain: TacticPlan[] = [];
  for (let plan = planById(tactic, planId); plan !== undefined; ) {
    chain.unshift(plan);
    plan = plan.parentId === null ? undefined : planById(tactic, plan.parentId);
  }

  const dead: Record<number, number> = {};
  chain.forEach((plan, i) => {
    const limit = chain[i + 1]?.forkAfter ?? Number.POSITIVE_INFINITY;
    for (const [slot, index] of Object.entries(plan.deaths)) {
      if (index <= limit) dead[Number(slot)] = index;
    }
  });
  return dead;
}

export interface StepOwner {
  readonly planId: string;
  /** The step's index in the owner's own `steps`. */
  readonly localIndex: number;
}

/**
 * The plan an edit at a step writes to: the plan that stores it, which is an ancestor when the
 * step lies in the prefix the plan shares. Null when the plan has no such step.
 */
export function ownerOf(tactic: Tactic, planId: string, stepIndex: number): StepOwner | null {
  const owner = ownerAt(tactic, planId, stepIndex);
  if (owner === null) return null;
  const local = stepIndex - ownedStart(owner);
  return local >= 0 && local < owner.steps.length ? { planId: owner.id, localIndex: local } : null;
}

function ownedStart(plan: TacticPlan): number {
  return plan.parentId === null ? 0 : plan.forkAfter + 1;
}

/** The plan whose own steps cover effective index `index`, walking up while it lies in the shared prefix. */
function ownerAt(tactic: Tactic, planId: string, index: number): TacticPlan | null {
  let plan = planById(tactic, planId);
  while (plan !== undefined && plan.parentId !== null && index <= plan.forkAfter) {
    plan = planById(tactic, plan.parentId);
  }
  return plan ?? null;
}

function replacePlan(
  tactic: Tactic,
  planId: string,
  update: (plan: TacticPlan) => TacticPlan,
): Tactic {
  return {
    ...tactic,
    plans: tactic.plans.map((plan) => (plan.id === planId ? update(plan) : plan)),
  };
}

/** Rewrites the step at an effective index in whichever plan stores it. */
export function updateStepIn(
  tactic: Tactic,
  planId: string,
  stepIndex: number,
  update: (step: TacticStep) => TacticStep,
): Tactic {
  const owner = ownerOf(tactic, planId, stepIndex);
  if (owner === null) return tactic;
  return replacePlan(tactic, owner.planId, (plan) => ({
    ...plan,
    steps: plan.steps.map((step, i) => (i === owner.localIndex ? update(step) : step)),
  }));
}

function shiftDeaths(
  deaths: Readonly<Record<number, number>>,
  at: number,
  delta: 1 | -1,
): Readonly<Record<number, number>> {
  const moved: Record<number, number> = {};
  for (const [slot, index] of Object.entries(deaths)) {
    const shifts = delta > 0 ? index >= at : index > at;
    moved[Number(slot)] = shifts ? index + delta : index;
  }
  return moved;
}

/**
 * After a step is inserted at (+1) or removed from (-1) effective index `at` of `planId`, moves
 * what counts steps there: the plan's deaths, and every branch that leaves at or after it — whose
 * own effective steps shift too, so they are walked in turn.
 */
function shiftFrom(plans: readonly TacticPlan[], planId: string, at: number, delta: 1 | -1) {
  let result = plans.map((plan) =>
    plan.id === planId ? { ...plan, deaths: shiftDeaths(plan.deaths, at, delta) } : plan,
  );
  for (const child of result.filter((plan) => plan.parentId === planId)) {
    if (!(delta > 0 ? at <= child.forkAfter : at < child.forkAfter)) continue;
    result = result.map((plan) =>
      plan.id === child.id ? { ...plan, forkAfter: plan.forkAfter + delta } : plan,
    );
    result = shiftFrom(result, child.id, at, delta);
  }
  return result;
}

/**
 * Inserts a step at an effective index (clamped to the plan's length). Inside the shared prefix it
 * lands in the ancestor that stores it, so every plan sharing that prefix gains it and keeps
 * leaving after the step it left after; at the plan's own start or end it belongs to the plan alone.
 */
export function insertStep(
  tactic: Tactic,
  planId: string,
  index: number,
  step: TacticStep,
): Tactic {
  const length = effectiveSteps(tactic, planId).length;
  const at = Math.max(0, Math.min(index, length));
  const owner = ownerAt(tactic, planId, at);
  if (owner === null) return tactic;
  const local = at - ownedStart(owner);
  const inserted = replacePlan(tactic, owner.id, (plan) => ({
    ...plan,
    steps: [...plan.steps.slice(0, local), step, ...plan.steps.slice(local)],
  }));
  return { ...inserted, plans: shiftFrom(inserted.plans, owner.id, at, 1) };
}

export type StepRemoval =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'missing' | 'only-step' | 'fork-point' };

function isForkPoint(tactic: Tactic, planId: string, index: number): boolean {
  return childPlans(tactic, planId).some(
    (child) =>
      index <= child.forkAfter &&
      (child.forkAfter === index || isForkPoint(tactic, child.id, index)),
  );
}

/** Whether a step can go, and why not: it is a plan's only step, or a branch leaves after it. */
export function canRemoveStep(tactic: Tactic, planId: string, index: number): StepRemoval {
  const owner = ownerOf(tactic, planId, index);
  const plan = owner === null ? undefined : planById(tactic, owner.planId);
  if (owner === null || plan === undefined) return { ok: false, reason: 'missing' };
  if (plan.steps.length <= 1) return { ok: false, reason: 'only-step' };
  if (isForkPoint(tactic, plan.id, index)) return { ok: false, reason: 'fork-point' };
  return { ok: true };
}

/** Removes the step at an effective index, or returns the tactic untouched when `canRemoveStep` says no. */
export function removeStep(tactic: Tactic, planId: string, index: number): Tactic {
  if (!canRemoveStep(tactic, planId, index).ok) return tactic;
  const owner = ownerOf(tactic, planId, index);
  if (owner === null) return tactic;
  const removed = replacePlan(tactic, owner.planId, (plan) => ({
    ...plan,
    steps: plan.steps.filter((_, i) => i !== owner.localIndex),
  }));
  return { ...removed, plans: shiftFrom(removed.plans, owner.planId, index, -1) };
}

/**
 * Adds a branch. The plan must name an existing parent, a fork inside that parent's effective
 * steps and an unused id; otherwise the tactic comes back unchanged.
 */
export function addPlan(tactic: Tactic, plan: TacticPlan): Tactic {
  if (plan.parentId === null || planById(tactic, plan.id) !== undefined) return tactic;
  const parentLength = effectiveSteps(tactic, plan.parentId).length;
  if (planById(tactic, plan.parentId) === undefined) return tactic;
  if (!Number.isInteger(plan.forkAfter) || plan.forkAfter < 0 || plan.forkAfter >= parentLength) {
    return tactic;
  }
  return { ...tactic, plans: [...tactic.plans, plan] };
}

/** Removes a branch and every branch below it. The root plan cannot be removed. */
export function removePlan(tactic: Tactic, planId: string): Tactic {
  const plan = planById(tactic, planId);
  if (plan === undefined || plan.parentId === null) return tactic;
  const doomed = new Set(planSubtree(tactic, planId).map((entry) => entry.id));
  return { ...tactic, plans: tactic.plans.filter((entry) => !doomed.has(entry.id)) };
}
