import type { EditorStep, EditorTactic } from './editor-tactic';

export function updateStepAt(
  tactic: EditorTactic,
  index: number,
  update: (step: EditorStep) => EditorStep,
): EditorTactic {
  const step = tactic.steps[index];
  if (step === undefined) return tactic;

  const updated = update(step);
  return { ...tactic, steps: tactic.steps.map((s, i) => (i === index ? updated : s)) };
}
