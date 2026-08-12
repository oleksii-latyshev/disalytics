import type { Round } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { memo } from 'react';
import { useRovingFocus } from '@/shared/hooks';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import type { RoundBand } from '../helpers/spine';

interface Props {
  rounds: readonly Round[];
  bands: readonly RoundBand[];
  onSeek: (roundIndex: number) => void;
}

/**
 * What the ribbon draws, in words — and the way it is pressed. The bands say who won each round in
 * colour and nothing else, so each one carries the same reading as its accessible name: number,
 * side, and how the round ended.
 *
 * This used to be an `sr-only` list beside the canvas. It is the same list, now doing the seeking
 * as well: two enumerations of the same thirty rounds, one readable and one clickable, would say
 * everything twice to anyone using both.
 *
 * Memoised because the ribbon around it re-renders off the 10 Hz readout, and a match's worth of
 * rounds has no business reconciling ten times a second (#91).
 */
export const RoundOutcomes = memo(function RoundOutcomes({ rounds, bands, onSeek }: Props) {
  const t = useT();
  const roving = useRovingFocus(bands.length);

  if (bands.length === 0) return null;

  return (
    <ol aria-label={t('timeline.outcomes')} className="absolute inset-0">
      {bands.map((band, index) => {
        const round = rounds.at(index);
        if (round === undefined) return null;

        return (
          <li key={band.round}>
            <button
              type="button"
              ref={roving.register(index)}
              tabIndex={index === roving.tabStop ? 0 : -1}
              aria-label={t(roundOutcomeKey(round.reason), {
                round: round.number,
                side: round.winner,
              })}
              onKeyDown={(event) => roving.onKeyDown(event, index)}
              onClick={() => {
                roving.select(index);
                onSeek(index);
              }}
              style={{
                left: `${band.startFraction * 100}%`,
                width: `${(band.endFraction - band.startFraction) * 100}%`,
              }}
              // The canvas underneath is the whole picture; a band adds no fill of its own and
              // shows where it is by the focus ring, which §2.6 keeps white and never removes.
              className="absolute inset-y-0 cursor-pointer focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
            />
          </li>
        );
      })}
    </ol>
  );
});
