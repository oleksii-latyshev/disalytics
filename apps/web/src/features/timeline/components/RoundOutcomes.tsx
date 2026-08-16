import type { Team } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { memo } from 'react';
import { useRovingFocus } from '@/shared/hooks';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import type { CellDetail, RoundCell } from '../helpers/round-list';

interface Props {
  cells: readonly RoundCell[];
  /** What every cell has room to carry — one width decides it for the list, not for each cell. */
  detail: CellDetail;
  litIndex: number | undefined;
  onSeek: (roundIndex: number) => void;
  /** A pointer resting on a cell. The tooltip waits §9.2's dwell before it answers. */
  onPoint: (roundIndex: number | null) => void;
  /** A cell taking focus, which has no dwell to wait through. */
  onReveal: (roundIndex: number | null) => void;
}

/** §7.3's tint: low enough that a full-height fill reads as an outcome rather than as a surface. */
const TINT: Readonly<Record<Team, string>> = { CT: 'bg-ct/14', T: 'bg-t/14' };

/**
 * `docs/DESIGN.md` §7.3 — one equal-width cell per round, carrying who won it and how close it was.
 * A list rather than a chart: the ribbon this replaces made a band as wide as its round was long, so
 * a 13-second round was a sliver nobody could hit, and getting to a round is what the strip is for.
 *
 * It is also the text equivalent for itself (#92). A canvas needed an `sr-only` list beside it to
 * say anything at all; cells are elements, so each one carries the whole reading — number, winner,
 * reason, survivors and the score the round left behind — as its own accessible name. Two
 * enumerations of the same thirty rounds would say everything twice to anyone using both.
 *
 * Memoised because the container re-renders off the 10 Hz readout and on every hover, and a match's
 * worth of rounds has no business reconciling at either rate (#91).
 */
export const RoundOutcomes = memo(function RoundOutcomes({
  cells,
  detail,
  litIndex,
  onSeek,
  onPoint,
  onReveal,
}: Props) {
  const t = useT();
  const roving = useRovingFocus(cells.length);

  if (cells.length === 0) return null;

  return (
    <ol aria-label={t('timeline.outcomes')} className="flex size-full">
      {cells.map((cell, index) => {
        const lit = index === litIndex;

        return (
          <li key={cell.number} className="min-w-0 flex-1">
            <button
              type="button"
              ref={roving.register(index)}
              tabIndex={index === roving.tabStop ? 0 : -1}
              aria-current={lit ? 'true' : undefined}
              aria-label={t('timeline.roundLabel', {
                outcome: t(roundOutcomeKey(cell.reason), {
                  round: cell.number,
                  side: cell.winner,
                }),
                survivors: cell.survivors,
                startedCt: cell.score.startedCt,
                startedT: cell.score.startedT,
              })}
              onKeyDown={(event) => roving.onKeyDown(event, index)}
              onClick={() => {
                roving.select(index);
                onSeek(index);
              }}
              onPointerEnter={() => onPoint(index)}
              onPointerLeave={() => onPoint(null)}
              onFocus={() => onReveal(index)}
              onBlur={() => onReveal(null)}
              // The round being played is lit by dropping the tint and framing what is left, so the
              // frame has bare strip to sit on rather than a brighter fill of the same hue.
              className={`flex size-full cursor-pointer flex-col items-center justify-center gap-px leading-none transition-colors duration-micro ease-out hover:bg-hover ${
                lit ? 'ring-1 ring-glass-edge ring-inset' : TINT[cell.winner]
              } ${index > 0 ? 'border-l border-line' : ''}`}
            >
              {detail !== 'tint' && (
                <span aria-hidden="true" className="numeric text-10 text-ink-dim">
                  {cell.number}
                </span>
              )}

              {detail === 'full' && (
                <span aria-hidden="true" className="numeric text-10 text-ink">
                  {cell.survivors}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
});
