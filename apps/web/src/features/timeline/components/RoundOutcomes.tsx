import type { Team } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import {
  motion,
  ToggleGroup,
  ToggleGroupHighlight,
  ToggleGroupItem,
  ToggleGroupItemHighlight,
} from '@disa/ui';
import { memo } from 'react';
import { pillArrival } from '@/core/motion';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import { PILL_GAP_PX, type RoundCell, trackSegments } from '../helpers/round-strip';

interface Props {
  cells: readonly RoundCell[];
  /** Whether the strip is wide enough for its round numbers — the one threshold on this row. */
  hasNumbers: boolean;
  /** Whether the survivor tracks are showing. The disclosure at the strip's end sets it. */
  isExpanded: boolean;
  litIndex: number | undefined;
  onSeek: (roundIndex: number) => void;
  /** A pointer resting on a pill. The tooltip waits its dwell before it answers. */
  onPoint: (roundIndex: number | null) => void;
  /** A pill taking focus, which has no dwell to wait through. */
  onReveal: (roundIndex: number | null) => void;
}

/**
 * The pill under the round being played. It is one element moving between the seats rather than a
 * fill appearing in a new one — a shared `layoutId`, so `motion` carries it on `transform` alone —
 * and it is the strip's only mark for *here*.
 */
const HIGHLIGHT_TRANSITION = { type: 'spring', stiffness: 420, damping: 38 } as const;

const WINNER_BAR: Readonly<Record<Team, string>> = { CT: 'bg-ct', T: 'bg-t' };

const TRACK_LIVE: Readonly<Record<Team, string>> = { CT: 'bg-ct', T: 'bg-t' };

/**
 * One side's survivors as a five-segment track, and only while the strip is expanded.
 *
 * No digits and no letters: the question the tracks answer is *how did it end*, and a shape answers
 * it without being read. The exact pair is a hover away and is in the pill's own name regardless.
 *
 * The direction the track fills is what carries the side alongside the hue — CT from the right, T
 * from the left, which is where the two team cards stand. `trackSegments` owns that rule.
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

interface PillProps {
  cell: RoundCell;
  index: number;
  hasNumbers: boolean;
  isExpanded: boolean;
  lit: boolean;
  ahead: boolean;
  label: string;
  onPoint: (roundIndex: number | null) => void;
  onReveal: (roundIndex: number | null) => void;
}

/**
 * One round, as the toggle it is: pressed while its round is the one playing, and pressed *by* the
 * group rather than by itself — the transport is the only thing that says which round is current,
 * and a pill that lit itself on press would give the strip a second answer.
 *
 * **It takes its props by name**, which is what keeps the effect around it out of the markup: the
 * highlight clones its child to inject `aria-selected`, a `data-*` set and a `position: relative`
 * style, none of which belongs on a button that already carries `aria-pressed`. A component that
 * does not spread its props drops all of it. What it must do itself is stand on its own layer —
 * `relative` here — because the highlight is an absolutely positioned sibling at `z-index: 0`, and a
 * static button's own text paints below one however late it comes in the DOM.
 */
function RoundPill({
  cell,
  index,
  hasNumbers,
  isExpanded,
  lit,
  ahead,
  label,
  onPoint,
  onReveal,
}: PillProps) {
  return (
    <ToggleGroupItem
      value={String(index)}
      aria-label={label}
      // `pb-1` only while expanded: the T track sits directly on the winner bar without it and the
      // two colours read as one mark. Collapsed there is nothing to separate, and the padding would
      // push the number off the pill's centre line.
      className={`relative flex size-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-chip px-0.5 leading-none transition-colors duration-(--duration-micro) ease-out hover:bg-hover ${
        isExpanded ? 'gap-px pb-1' : ''
      }`}
      onPointerEnter={() => onPoint(index)}
      onPointerLeave={() => onPoint(null)}
      onFocus={() => onReveal(index)}
      onBlur={() => onReveal(null)}
    >
      {hasNumbers && (
        <span aria-hidden="true" className={`numeric text-13 ${numberInk(lit, ahead)}`}>
          {cell.number}
        </span>
      )}

      {isExpanded && (
        <span aria-hidden="true" className="flex w-full flex-col gap-px">
          <SurvivorTrack side="CT" alive={cell.survivors.CT} />
          <SurvivorTrack side="T" alive={cell.survivors.T} />
        </span>
      )}

      {/* Every pill keeps its winner bar, the lit one included. It used to drop the bar for a fill,
          which was a way of saying *here* on a strip that had no other; the highlight says it now,
          and a bar that vanished under it would blink out of one pill and into another every time
          the round turned over. */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-0.5 ${WINNER_BAR[cell.winner]}`}
      />
    </ToggleGroupItem>
  );
}

/**
 * One equal-width pill per round, carrying who won it and nothing else until the reader asks for
 * more. A list rather than a chart: the ribbon this replaces made a band as wide as its round was
 * long, so a 13-second round was a sliver nobody could hit, and getting to a round is what the strip
 * is for.
 *
 * The pills are separated by space rather than by a hairline, and the winner is a bar on the pill's
 * bottom edge rather than a tint over the whole of it. Both are the same correction: the pill has to
 * read as an object before its contents can have an order, and a filled cell spends the whole pill
 * on one bit.
 *
 * **It is a toggle group rather than a list** since #279, and the pressed state is what changed the
 * markup: a pill says which round is playing, and `aria-pressed` is the reading for that where a
 * `listitem` had none. The group also owns the roving focus the strip used to implement itself —
 * one tab stop, the arrow keys walking the rounds — so `useRovingFocus` is the axis's alone now.
 *
 * It is still the text equivalent for itself (#92). A canvas needed an `sr-only` list beside it to
 * say anything at all; a pill is an element, so each one carries the whole reading — number, winner,
 * reason, survivors and the score the round left behind — as its own accessible name, **and that
 * name does not change when the strip is collapsed**. It is what holds the ink floor now that the
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

  if (cells.length === 0) return null;

  function handleValueChange(values: readonly string[]): void {
    const pressed = values.at(0);

    // A single-choice group unpresses what was pressed, so pressing the round already playing
    // arrives here as an empty selection. The reader named a round either way, and the round they
    // named is the one that is lit: it seeks to the start of it rather than doing nothing.
    const index = pressed === undefined ? litIndex : Number(pressed);
    if (index !== undefined) onSeek(index);
  }

  return (
    <ToggleGroup
      aria-label={t('timeline.outcomes')}
      value={litIndex === undefined ? [] : [String(litIndex)]}
      onValueChange={handleValueChange}
      className="flex size-full items-stretch"
      style={{ gap: `${PILL_GAP_PX}px` }}
    >
      <ToggleGroupHighlight className="rounded-chip bg-selected" transition={HIGHLIGHT_TRANSITION}>
        {cells.map((cell, index) => (
          // The pill lights in its own place in the row when the match arrives — the screen's one
          // orchestrated moment, and the only thing on this strip that is a function of wall time.
          // It is a mount transition, so it runs when the screen does and never again, and it is
          // **the seat that carries it**: a toggle inside a group is a plain button, because a
          // motion element there never receives the composite's ref and the arrow keys stop moving
          // the focus with it (`UPSTREAM.md`).
          //
          // `ms-2` on top of the row's 4px gap is the 12px segment break, and the rule sits at
          // -6px, which is that break's centre line. It is a `::before` rather than an element,
          // because the highlight below takes exactly one child.
          <motion.div
            key={cell.number}
            {...pillArrival(index, cells.length)}
            className={`relative min-w-0 flex-1 ${
              cell.startsSegment
                ? 'ms-2 before:absolute before:inset-y-1 before:-left-1.5 before:border-line before:border-l before:border-dashed'
                : ''
            }`}
          >
            <ToggleGroupItemHighlight
              value={String(index)}
              // The effect writes `aria-selected` onto the seat as well as onto what it wraps, and
              // a generic element may not carry it. Passing it undefined drops the attribute; the
              // reading is the button's own `aria-pressed`, which the group owns.
              aria-selected={undefined}
              className="size-full"
            >
              <RoundPill
                cell={cell}
                index={index}
                hasNumbers={hasNumbers}
                isExpanded={isExpanded}
                lit={index === litIndex}
                ahead={litIndex !== undefined && index > litIndex}
                label={t('timeline.roundLabel', {
                  outcome: t(roundOutcomeKey(cell.reason), {
                    round: cell.number,
                    side: cell.winner,
                  }),
                  ct: cell.survivors.CT,
                  t: cell.survivors.T,
                  startedCt: cell.score.startedCt,
                  startedT: cell.score.startedT,
                })}
                onPoint={onPoint}
                onReveal={onReveal}
              />
            </ToggleGroupItemHighlight>
          </motion.div>
        ))}
      </ToggleGroupHighlight>
    </ToggleGroup>
  );
});
