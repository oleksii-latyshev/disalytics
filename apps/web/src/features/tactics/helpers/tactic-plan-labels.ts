import type { TacticPlan } from '@disa/demo-core';

/** What a plan is called: its condition, or the fallback when none is written. */
export function planTitle(plan: TacticPlan, fallbacks: { root: string; branch: string }): string {
  const text = plan.condition.trim();
  if (text !== '') return text;
  return plan.parentId === null ? fallbacks.root : fallbacks.branch;
}

/** The slots a plan marks out, in slot order, as the numbers players are shown with. */
export function deadSlotNumbers(plan: TacticPlan): readonly number[] {
  return Object.keys(plan.deaths)
    .map((slot) => Number(slot) + 1)
    .sort((a, b) => a - b);
}
