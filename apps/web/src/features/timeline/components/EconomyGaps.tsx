import { Text, useT } from '@disa/i18n';
import { memo } from 'react';
import type { EconomyStep } from '../helpers/economy';

interface Props {
  steps: readonly EconomyStep[];
}

/**
 * The economy chart in words. The blocks carry the gap in a direction and a colour, which says
 * nothing to a reader who cannot see either — this says which side came out of freeze time better
 * equipped and by how much, one whole sentence per round.
 *
 * It is a list of its own rather than a second sentence inside `RoundOutcomes` so that each item
 * stays one sentence, which is what a screen reader announces as a unit.
 *
 * Memoised for the reason `KillMarkers` is: the spine above it re-renders off the 10 Hz readout.
 */
export const EconomyGaps = memo(function EconomyGaps({ steps }: Props) {
  const t = useT();

  if (steps.length === 0) return null;

  return (
    <ol className="sr-only" aria-label={t('timeline.economy.label')}>
      {steps.map((step) =>
        step.leader === null ? (
          <Text
            key={step.round}
            as="li"
            path="timeline.economy.even"
            values={{ round: step.round }}
          />
        ) : (
          <Text
            key={step.round}
            as="li"
            path="timeline.economy.lead"
            values={{ round: step.round, side: step.leader, value: step.difference }}
          />
        ),
      )}
    </ol>
  );
});
