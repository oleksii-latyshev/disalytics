import {
  type MatchScore,
  matchScore,
  matchSegments,
  type ParsedDemo,
  type RoundWinReason,
  roundSurvivors,
  type SideSurvivors,
  type Team,
} from '@disa/demo-core';

/** The strip's two heights — `docs/DESIGN.md` §7.3, the timeline block's top row. */
export const ROUND_STRIP_HEIGHT_PX = 28;
export const ROUND_STRIP_EXPANDED_HEIGHT_PX = 44;

/** Between two pills of the same segment. Space is the separation; there are no hairlines. */
export const PILL_GAP_PX = 4;

/** Between two segments, with §7.3's dotted rule in it. */
export const SEGMENT_GAP_PX = 12;

/**
 * Under this a pill has no room for a legible number and §7.3 drops to the winner bar alone.
 *
 * The row's own arithmetic rather than a guess. Plex Mono advances 0.6em and §3 gives 13 no
 * tracking, so a two-digit round number is 15.6px; 2px of padding either side puts the pill at
 * 19.6px, and §4's 4px grid rounds it to 20.
 */
const PILL_MIN_PX = 20;

/** How many survivors a side can have, which is what the expanded tracks draw as segments. */
export const TRACK_SEGMENTS = 5;

export interface RoundCell {
  readonly number: number;
  readonly winner: Team;
  readonly reason: RoundWinReason;
  /** How many players each side still had when the round ended. */
  readonly survivors: SideSurvivors;
  /** The match score once this round was over, which is what a hover names. */
  readonly score: MatchScore;
  /**
   * Whether a segment of the match starts here — §7.3's divider. True for the first round of the
   * second half and of every overtime half, and never for the first round of the match: a divider
   * before the strip begins would separate it from nothing.
   */
  readonly startsSegment: boolean;
}

/**
 * One pill per round, derived once per demo — never inside a render running at the readout's rate
 * (#91). Nothing here is a function of the frame: a round's winner, its survivors, the score it
 * left behind and the segment it belongs to are all settled by the time it ends.
 */
export function roundCells(demo: ParsedDemo): readonly RoundCell[] {
  const starts = new Set(matchSegments(demo).map((segment) => segment.startIndex));

  return demo.events.rounds.map((round, index) => ({
    number: round.number,
    winner: round.winner,
    reason: round.reason,
    survivors: roundSurvivors(demo, index),
    score: matchScore(demo, index),
    startsSegment: index > 0 && starts.has(index),
  }));
}

/** Where a tooltip hangs over the strip: pinned by one edge, never by both. */
export type TooltipAnchor = { readonly left: string } | { readonly right: string };

/**
 * A pill's tooltip is anchored at the pill's centre and grows away from the nearer end of the
 * strip. That is what keeps the first and the last round's tooltip inside a card that clips its
 * overflow, without measuring the tooltip or clamping anything: the furthest a centred pill has to
 * reach is half the strip, and the sentence is nowhere near that wide.
 */
export function tooltipAnchor(index: number, count: number): TooltipAnchor {
  return anchorAtFraction(count === 0 ? 0 : (index + 0.5) / count);
}

/**
 * The same rule read off a position along the strip rather than off a cell index, which is what
 * §7.1's glyphs need: they are placed by fraction, not by an equal share of the width.
 */
export function anchorAtFraction(fraction: number): TooltipAnchor {
  return fraction <= 0.5 ? { left: `${fraction * 100}%` } : { right: `${(1 - fraction) * 100}%` };
}

/**
 * Whether a strip this wide can carry its round numbers — §7.3's one threshold, down from the three
 * rows the flush list degraded through. Pills are equal-width, so one division decides it for the
 * whole strip rather than per pill.
 *
 * The gaps come out first because they are fixed: `count - 1` of them at `PILL_GAP_PX`, with every
 * segment boundary widened to `SEGMENT_GAP_PX`. What is left is the pills'.
 *
 * A strip that has not been measured yet keeps its numbers: §7.3's arithmetic puts every real match
 * above the threshold, and assuming the floor instead would flash a row of bare bars on every mount.
 */
export function hasRoomForNumbers(widthPx: number, cells: readonly RoundCell[]): boolean {
  if (cells.length === 0 || widthPx === 0) return true;

  const breaks = cells.reduce((total, cell) => (cell.startsSegment ? total + 1 : total), 0);
  const gapsPx = (cells.length - 1) * PILL_GAP_PX + breaks * (SEGMENT_GAP_PX - PILL_GAP_PX);

  return (widthPx - gapsPx) / cells.length >= PILL_MIN_PX;
}

export interface TrackSegment {
  /** The seat's place in the track, 1 to `TRACK_SEGMENTS`, counted left to right. */
  readonly position: number;
  readonly isLive: boolean;
}

/**
 * A side's survivors as five seats, ordered left to right.
 *
 * **CT fills from the right and T fills from the left**, which is where §5.3 puts the two team
 * cards. The side is carried by the direction the track fills as well as by its hue, so §14's floor
 * survives the `CT` and `T` letters leaving the pill.
 *
 * A seat carries its own place rather than borrowing the caller's loop index: the track never
 * reorders, and the position *is* the seat's identity.
 */
export function trackSegments(side: Team, alive: number): readonly TrackSegment[] {
  const count = Math.max(Math.min(alive, TRACK_SEGMENTS), 0);

  return Array.from({ length: TRACK_SEGMENTS }, (_, index) => ({
    position: index + 1,
    isLive: side === 'T' ? index < count : index >= TRACK_SEGMENTS - count,
  }));
}
