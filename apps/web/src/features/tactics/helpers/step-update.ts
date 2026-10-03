import type { Tactic, TacticStep } from '@disa/demo-core';

export function updateStepAt(
  tactic: Tactic,
  index: number,
  update: (step: TacticStep) => TacticStep,
): Tactic {
  const step = tactic.steps[index];
  if (step === undefined) return tactic;

  const updated = update(step);
  return { ...tactic, steps: tactic.steps.map((s, i) => (i === index ? updated : s)) };
}
