import type { Round } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { memo } from 'react';
import { roundOutcomeKey } from '../helpers/outcome-copy';

interface Props {
  rounds: readonly Round[];
}

/**
 * What the canvas draws, in words. The bands say who won each round in colour and nothing else, so
 * this carries the same reading — number, side, and how the round ended — for anyone the colour
 * does not reach.
 *
 * Memoised for the same reason `KillMarkers` is: the spine around it re-renders off the 10 Hz
 * readout, and a match's worth of rounds has no business reconciling ten times a second.
 */
export const RoundOutcomes = memo(function RoundOutcomes({ rounds }: Props) {
  const t = useT();

  if (rounds.length === 0) return null;

  return (
    <ol className="sr-only" aria-label={t('timeline.outcomes')}>
      {rounds.map((round) => (
        <Text
          key={round.number}
          as="li"
          path={roundOutcomeKey(round.reason)}
          values={{ round: round.number, side: round.winner }}
        />
      ))}
    </ol>
  );
});
