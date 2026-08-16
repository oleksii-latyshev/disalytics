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

const SIDE_INK: Readonly<Record<Team, string>> = { CT: 'text-ct', T: 'text-t' };

/**
 * One side's survivor count with the side written under it — §7.3.
 *
 * The letters are not decoration. A count that is told from its neighbour by hue alone asks the
 * reader to hold the palette in their head at 10px, and the tint of the cell behind it is already
 * spending that same pair of colours on who *won*. Written out, the colour becomes the redundant
 * channel rather than the only one — DESIGN.md §14's floor, which is that side identity never
 * relies on hue alone.
 */
function SurvivorColumn({ side, count }: { side: Team; count: number }) {
  return (
    <span aria-hidden="true" className="flex flex-1 flex-col items-center gap-px leading-none">
      <span className="numeric text-10 text-ink-dim">{count}</span>
      <span className={`numeric text-10 ${SIDE_INK[side]}`}>{side}</span>
    </span>
  );
}

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
                ct: cell.survivors.CT,
                t: cell.survivors.T,
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
              className={`flex size-full cursor-pointer items-center justify-center leading-none transition-colors duration-micro ease-out hover:bg-hover ${
                lit ? 'ring-1 ring-glass-edge ring-inset' : TINT[cell.winner]
              } ${index > 0 ? 'border-l border-line' : ''}`}
            >
              {/* The two side columns are equally `flex-1`, which is what keeps the round number on
                  the cell's centre line whatever the counts either side of it are. */}
              {detail === 'full' && <SurvivorColumn side="CT" count={cell.survivors.CT} />}

              {/* Medium rather than a larger size: Plex Mono advances the same at 400 and 500, so
                  the weight buys the number its emphasis without moving `FULL_MIN_PX`. */}
              {detail !== 'tint' && (
                <span aria-hidden="true" className="numeric font-medium text-12 text-ink">
                  {cell.number}
                </span>
              )}

              {detail === 'full' && <SurvivorColumn side="T" count={cell.survivors.T} />}
            </button>
          </li>
        );
      })}
    </ol>
  );
});
