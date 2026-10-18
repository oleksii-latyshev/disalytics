import type { RoundStepKind, RoundTactic, Tactic } from '@disa/demo-core';
import type { TranslationKey, useT } from '@disa/i18n';

const STEP_KEYS: Readonly<Record<RoundStepKind, TranslationKey>> = {
  opening: 'review.tactics.step.opening',
  utility: 'review.tactics.step.utility',
  contact: 'review.tactics.step.contact',
  defence: 'review.tactics.step.defence',
  retake: 'review.tactics.step.retake',
};

type Translate = ReturnType<typeof useT>;

/** Step names from the codes demo-core returns; a kind that repeats is numbered. */
export function stepNames(kinds: readonly RoundStepKind[], t: Translate): readonly string[] {
  return kinds.map((kind, index) => {
    const name = t(STEP_KEYS[kind]);
    const same = kinds.filter((other) => other === kind);
    if (same.length === 1) return name;
    const order = kinds.slice(0, index + 1).filter((other) => other === kind).length;
    return t('review.tactics.step.numbered', { name, index: order });
  });
}

export interface RoundTitle {
  readonly map: string;
  readonly round: number;
}

/** The tactic of a round with its title and step names written in the reader's language. */
export function namedRoundTactic(result: RoundTactic, title: RoundTitle, t: Translate): Tactic {
  const names = stepNames(result.stepKinds, t);
  const { tactic } = result;
  return {
    ...tactic,
    title: t('review.tactics.title', {
      map: title.map,
      side: result.side,
      round: title.round,
    }),
    plans: tactic.plans.map((plan) => ({
      ...plan,
      steps: plan.steps.map((step, index) => ({ ...step, name: names[index] ?? '' })),
    })),
  };
}
