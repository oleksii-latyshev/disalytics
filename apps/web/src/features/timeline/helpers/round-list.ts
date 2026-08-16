import {
  type MatchScore,
  matchScore,
  type ParsedDemo,
  type RoundWinReason,
  roundSurvivors,
  type Team,
} from '@disa/demo-core';

/** The strip's height — `docs/DESIGN.md` §7.3, flush to the timeline block's bottom edge. */
export const ROUND_LIST_HEIGHT_PX = 32;

/** Under this a cell has no room for a legible number and §7.3 drops to the tint alone. */
const NUMBER_MIN_PX = 14;

/**
 * Under this the survivor count goes first. It is the extra, where the number is the way in — a
 * number that has to be read at 8px is worse than no number.
 */
const COUNT_MIN_PX = 20;

/** What a cell has room to carry — §7.3's three rows, narrowest last. */
export type CellDetail = 'full' | 'number' | 'tint';

export interface RoundCell {
  readonly number: number;
  readonly winner: Team;
  readonly reason: RoundWinReason;
  /** How many players the winning side still had when the round ended. */
  readonly survivors: number;
  /** The match score once this round was over, which is what a hover names. */
  readonly score: MatchScore;
}

/**
 * One cell per round, derived once per demo — never inside a render running at the readout's rate
 * (#91). Nothing here is a function of the frame: a round's winner, its survivors and the score it
 * left behind are all settled by the time it ends.
 */
export function roundCells(demo: ParsedDemo): readonly RoundCell[] {
  return demo.events.rounds.map((round, index) => ({
    number: round.number,
    winner: round.winner,
    reason: round.reason,
    survivors: roundSurvivors(demo, index),
    score: matchScore(demo, index),
  }));
}

/** Where a tooltip hangs over the strip: pinned by one edge, never by both. */
export type TooltipAnchor = { readonly left: string } | { readonly right: string };

/**
 * A cell's tooltip is anchored at the cell's centre and grows away from the nearer end of the
 * strip. That is what keeps the first and the last round's tooltip inside a card that clips its
 * overflow, without measuring the tooltip or clamping anything: the furthest a centred cell has to
 * reach is half the strip, and the sentence is nowhere near that wide.
 */
export function tooltipAnchor(index: number, count: number): TooltipAnchor {
  const centre = count === 0 ? 0 : (index + 0.5) / count;

  return centre <= 0.5 ? { left: `${centre * 100}%` } : { right: `${(1 - centre) * 100}%` };
}

/**
 * Which of §7.3's three rows a strip of this width renders. Cells are equal-width, so one division
 * decides it for the whole list rather than per cell.
 *
 * A strip that has not been measured yet renders the full row: §7.3's arithmetic puts every real
 * match there, and assuming the floor instead would flash a list of bare tints on every mount.
 */
export function cellDetail(widthPx: number, count: number): CellDetail {
  if (count === 0 || widthPx === 0) return 'full';

  const cellPx = widthPx / count;

  if (cellPx >= COUNT_MIN_PX) return 'full';

  return cellPx >= NUMBER_MIN_PX ? 'number' : 'tint';
}
