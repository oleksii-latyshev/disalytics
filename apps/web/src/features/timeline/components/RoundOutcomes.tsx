import type { Team } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { m } from '@disa/ui';
import { memo } from 'react';
import { pillArrival } from '@/core/motion';
import { useRovingFocus } from '@/shared/hooks';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import { PILL_GAP_PX, type RoundCell, trackSegments } from '../helpers/round-strip';

interface Props {
  cells: readonly RoundCell[];
  /** Whether the strip is wide enough for its round numbers — §7.3's one threshold. */
  hasNumbers: boolean;
  /** Whether the survivor tracks are showing. The disclosure at the strip's end sets it. */
  isExpanded: boolean;
  litIndex: number | undefined;
  onSeek: (roundIndex: number) => void;
  /** A pointer resting on a pill. The tooltip waits §9.2's dwell before it answers. */
  onPoint: (roundIndex: number | null) => void;
  /** A pill taking focus, which has no dwell to wait through. */
  onReveal: (roundIndex: number | null) => void;
}

const WINNER_BAR: Readonly<Record<Team, string>> = { CT: 'bg-ct', T: 'bg-t' };

const TRACK_LIVE: Readonly<Record<Team, string>> = { CT: 'bg-ct', T: 'bg-t' };

/**
 * One side's survivors as a five-segment track — §7.3, and only while the strip is expanded.
 *
 * No digits and no letters: the question the tracks answer is *how did it end*, and a shape answers
 * it without being read. The exact pair is a hover away and is in the pill's own name regardless.
 *
 * The direction the track fills is what carries the side alongside the hue — CT from the right, T
 * from the left, which is where §5.3 puts the two team cards. `trackSegments` owns that rule.
 */
function SurvivorTrack({ side, alive }: { side: Team; alive: number }) {
  return (
    <span className="flex gap-px">
      {trackSegments(side, alive).map((seat) => (
        // A lost seat is nearly out rather than half in. At α0.40 the two tracks read as a dotted
        // texture and the live seats had to be picked out of it; at α0.20 the shape is the pips.
        <span
          key={seat.position}
          className={`h-[3px] flex-1 rounded-[1px] ${
            seat.isLive ? TRACK_LIVE[side] : 'bg-ink-faint/20'
          }`}
        />
      ))}
    </span>
  );
}

/** The ink a round number takes: the one being played, one already watched, or one still ahead. */
function numberInk(lit: boolean, ahead: boolean): string {
  if (lit) return 'font-medium text-ink';

  return ahead ? 'text-ink-dim' : 'text-ink';
}

interface FaceProps {
  cell: RoundCell;
  hasNumbers: boolean;
  isExpanded: boolean;
  lit: boolean;
  ahead: boolean;
}

/** What is drawn inside a pill — §7.3's number, its survivor tracks and its winner bar. */
function PillFace({ cell, hasNumbers, isExpanded, lit, ahead }: FaceProps) {
  return (
    <>
      {hasNumbers && (
        <span aria-hidden="true" className={`numeric text-13 ${numberInk(lit, ahead)}`}>
          {cell.number}
        </span>
      )}

      {isExpanded && (
        <span aria-hidden="true" className="flex w-full flex-col gap-0.5">
          <SurvivorTrack side="CT" alive={cell.survivors.CT} />
          <SurvivorTrack side="T" alive={cell.survivors.T} />
        </span>
      )}

      {!lit && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-0.5 ${WINNER_BAR[cell.winner]}`}
        />
      )}
    </>
  );
}

/**
 * `docs/DESIGN.md` §7.3 — one equal-width pill per round, carrying who won it and nothing else
 * until the reader asks for more. A list rather than a chart: the ribbon this replaces made a band
 * as wide as its round was long, so a 13-second round was a sliver nobody could hit, and getting to
 * a round is what the strip is for.
 *
 * The pills are separated by space rather than by a hairline, and the winner is a bar on the pill's
 * bottom edge rather than a tint over the whole of it. Both are the same correction: the pill has to
 * read as an object before its contents can have an order, and a filled cell spends the whole pill
 * on one bit.
 *
 * It is also the text equivalent for itself (#92). A canvas needed an `sr-only` list beside it to
 * say anything at all; pills are elements, so each one carries the whole reading — number, winner,
 * reason, survivors and the score the round left behind — as its own accessible name, **and that
 * name does not change when the strip is collapsed**. It is what holds §14's floor now that the
 * `CT` and `T` letters have left the pill.
 *
 * Memoised because the container re-renders off the 10 Hz readout and on every hover, and a match's
 * worth of rounds has no business reconciling at either rate (#91).
 */
export const RoundOutcomes = memo(function RoundOutcomes({
  cells,
  hasNumbers,
  isExpanded,
  litIndex,
  onSeek,
  onPoint,
  onReveal,
}: Props) {
  const t = useT();
  const roving = useRovingFocus(cells.length);

  if (cells.length === 0) return null;

  return (
    <ol
      aria-label={t('timeline.outcomes')}
      className="flex size-full items-stretch"
      style={{ gap: `${PILL_GAP_PX}px` }}
    >
      {cells.map((cell, index) => {
        const lit = index === litIndex;
        const ahead = litIndex !== undefined && index > litIndex;

        return (
          // `ms-2` on top of the row's 4px gap is §7.3's 12px segment break, and the rule sits at
          // -6px, which is that break's centre line.
          //
          // The pill lights in its own place in the row when the match arrives — §8's one
          // orchestrated moment, and the only thing on this strip that is a function of wall time.
          // It is a mount transition, so it runs when the screen does and never again.
          <m.li
            key={cell.number}
            {...pillArrival(index, cells.length)}
            className={`relative min-w-0 flex-1 ${cell.startsSegment ? 'ms-2' : ''}`}
          >
            {cell.startsSegment && (
              <span
                aria-hidden="true"
                className="absolute inset-y-1 -left-1.5 border-l border-dashed border-line"
              />
            )}

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
              // The round being played drops its winner bar for a fill and a frame — *here* rather
              // than a brighter outcome, which is what a tinted highlight always ends up meaning.
              // `pb-1.5` only while expanded: the T track sits directly on the winner bar without
              // it and the two colours read as one mark. Collapsed there is nothing to separate,
              // and the padding would push the number off the pill's centre line.
              className={`relative flex size-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-chip px-0.5 leading-none transition-colors duration-(--duration-micro) ease-out hover:bg-hover ${
                isExpanded ? 'pb-1.5' : ''
              } ${lit ? 'bg-ink/10 ring-1 ring-line ring-inset' : ''}`}
            >
              <PillFace
                cell={cell}
                hasNumbers={hasNumbers}
                isExpanded={isExpanded}
                lit={lit}
                ahead={ahead}
              />
            </button>
          </m.li>
        );
      })}
    </ol>
  );
});
