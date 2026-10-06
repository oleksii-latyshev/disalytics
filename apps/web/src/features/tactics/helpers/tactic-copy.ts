import type { Tactic, TacticPlan } from '@disa/demo-core';
import { generateId } from './editor-actions';

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
