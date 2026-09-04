import type { DefuseOutcome } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

/**
 * A defuse says which of the three endings it had, for the same reason a round says its reason.
 *
 * It sits beside the row rather than in `features/timeline` because the strings do: the feed and the
 * axis draw the same defuse, and a sentence two features say belongs to the slice they both import
 * (#214). The feed only ever names `completed` — it draws a defuse that happened — and the axis is
 * what has all three.
 */
export function defuseOutcomeKey(status: DefuseOutcome['status']): TranslationKey {
  switch (status) {
    case 'completed':
      return 'events.defuse.completed';
    case 'aborted':
      return 'events.defuse.aborted';
    case 'interrupted':
      return 'events.defuse.interrupted';
  }
}
