import type { TeamBuyClass } from './team-stats';

/** The buys a heat map can be narrowed to: a pistol round, or one of the three team buys. */
export const HEAT_BUYS = ['pistol', 'eco', 'force', 'full'] as const;

export type HeatBuy = (typeof HEAT_BUYS)[number];

/** How wide a step of the round-time axis is, in seconds. */
export const HEAT_BIN_SECONDS = 5;

/**
 * How many steps the axis has. The last one is open-ended: a round that goes past
 * `HEAT_BINS × HEAT_BIN_SECONDS` seconds puts the rest of it there.
 */
export const HEAT_BINS = 30;

/**
 * A part of the round, in seconds from the end of freeze time: `fromSeconds` up to but not
 * including `toSeconds`, which is `Number.POSITIVE_INFINITY` for a window that runs to the end.
 */
export interface HeatWindow {
  readonly fromSeconds: number;
  readonly toSeconds: number;
}

/** The three parts of a round the utility view reads apart, as the steps of the axis they cover. */
export const HEAT_PHASES = [
  { id: 'start', firstBin: 0, lastBin: 3 },
  { id: 'middle', firstBin: 4, lastBin: 11 },
  { id: 'end', firstBin: 12, lastBin: HEAT_BINS - 1 },
] as const;

export type HeatPhaseId = (typeof HEAT_PHASES)[number]['id'];

/** Whether a range of steps is the whole round, which narrows nothing. */
export function isWholeRound(firstBin: number, lastBin: number): boolean {
  return firstBin <= 0 && lastBin >= HEAT_BINS - 1;
}

/** The window the steps `firstBin`…`lastBin` (both included) stand for; `null` for the whole round. */
export function heatWindowOfBins(firstBin: number, lastBin: number): HeatWindow | null {
  if (isWholeRound(firstBin, lastBin)) return null;

  return {
    fromSeconds: Math.max(firstBin, 0) * HEAT_BIN_SECONDS,
    toSeconds:
      lastBin >= HEAT_BINS - 1 ? Number.POSITIVE_INFINITY : (lastBin + 1) * HEAT_BIN_SECONDS,
  };
}

/** The step of the axis a moment falls in, clamped to the axis on both ends. */
export function heatBinOf(secondsIntoRound: number): number {
  return Math.min(Math.max(Math.floor(secondsIntoRound / HEAT_BIN_SECONDS), 0), HEAT_BINS - 1);
}

/** Whether a moment is inside a window. A mark before freeze time ended is in none. */
export function isInHeatWindow(window: HeatWindow | null, secondsIntoRound: number): boolean {
  if (window === null) return true;

  return secondsIntoRound >= window.fromSeconds && secondsIntoRound < window.toSeconds;
}

/** Whether the buy a side made is the one asked for. A round with no buy to read is in none. */
export function isHeatBuy(wanted: HeatBuy | null, made: TeamBuyClass | null): boolean {
  return wanted === null || made === wanted;
}
