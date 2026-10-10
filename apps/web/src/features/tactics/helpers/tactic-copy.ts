import type { Tactic, TacticPlan } from '@disa/demo-core';
import { generateId } from '@disa/tactic-board';

/**
 * A tactic's plans with every step, throw, drawing and enemy under a new id, so a copy shares
 * nothing with its source. Plan ids stay: they only mean something inside one tactic.
 */
export function renewedPlans(source: Tactic): readonly TacticPlan[] {
  return source.plans.map((plan) => ({
    ...plan,
    steps: plan.steps.map((step) => ({
      ...step,
      id: generateId('step'),
      throws: step.throws.map((thrown) => ({ ...thrown, id: generateId('throw') })),
      drawings: step.drawings?.map((draw) => ({ ...draw, id: generateId('draw') })),
      enemies: step.enemies?.map((enemy) => ({ ...enemy, id: generateId('enemy') })),
    })),
  }));
}

/**
 * A tactic of the reader's own made from `source`: a new id, nothing shared with it, and the time
 * it was made. A built-in becomes the reader's through this, and so does a duplicate.
 */
export function copiedTactic(source: Tactic, title: string = source.title): Tactic {
  const now = Date.now();
  return {
    ...source,
    id: generateId('tactic'),
    title,
    createdAt: now,
    updatedAt: now,
    plans: renewedPlans(source),
  };
}
