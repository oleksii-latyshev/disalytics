import type { DefuseOutcome, RoundWinReason } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

type OutcomeStem =
  | 'bombExploded'
  | 'bombDefused'
  | 'allCtEliminated'
  | 'allTEliminated'
  | 'timeExpired'
  | 'draw';

function stemFor(reason: RoundWinReason): OutcomeStem {
  switch (reason) {
    case 'bomb-exploded':
      return 'bombExploded';
    case 'bomb-defused':
      return 'bombDefused';
    case 'all-ct-eliminated':
      return 'allCtEliminated';
    case 'all-t-eliminated':
      return 'allTEliminated';
    case 'time-expired':
      return 'timeExpired';
    case 'draw':
      return 'draw';
  }
}

// Returns TranslationKey rather than the template literal it builds, so a reason the `timeline`
// namespace has no sentence for fails to compile here rather than at the strip that renders it.
export function roundOutcomeKey(reason: RoundWinReason): TranslationKey {
  return `timeline.outcome.${stemFor(reason)}` as const;
}

/** A defuse says which of the three endings it had, for the same reason a round says its reason. */
export function defuseOutcomeKey(status: DefuseOutcome['status']): TranslationKey {
  switch (status) {
    case 'completed':
      return 'timeline.defuse.completed';
    case 'aborted':
      return 'timeline.defuse.aborted';
    case 'interrupted':
      return 'timeline.defuse.interrupted';
  }
}
