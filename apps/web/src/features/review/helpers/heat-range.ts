import {
  HEAT_BIN_SECONDS,
  HEAT_BINS,
  HEAT_PHASES,
  type HeatPhaseId,
  type HeatWindow,
  heatWindowOfBins,
  isWholeRound,
} from '@disa/demo-core';

/**
 * The part of every round the heat map is narrowed to, as steps of the round-time axis. `pending`
 * is the first press of a custom range, waiting for its second.
 */
export interface RoundRange {
  readonly first: number;
  readonly last: number;
  readonly pending: number | null;
}

const LAST_BIN = HEAT_BINS - 1;

export const WHOLE_RANGE: RoundRange = { first: 0, last: LAST_BIN, pending: null };

/** How many steps of the axis one window of *Play round* covers: ten seconds. */
export const PLAY_WINDOW_BINS = 2;

/** The step a played round starts its last window at. */
export const PLAY_LAST_STEP = HEAT_BINS - PLAY_WINDOW_BINS;

export function rangeOfPhase(id: HeatPhaseId): RoundRange {
  const phase = HEAT_PHASES.find((each) => each.id === id) ?? HEAT_PHASES[0];

  return { first: phase.firstBin, last: phase.lastBin, pending: null };
}

/** Which phase a range is exactly, if it is one. */
export function phaseOfRange(range: RoundRange): HeatPhaseId | null {
  return (
    HEAT_PHASES.find((each) => each.firstBin === range.first && each.lastBin === range.last)?.id ??
    null
  );
}

/**
 * A step of the axis pressed. The first press is a range of that one step, waiting; the second
 * closes it — in whichever order the two were pressed.
 */
export function pickBin(range: RoundRange, bin: number): RoundRange {
  if (range.pending === null) return { first: bin, last: bin, pending: bin };

  return {
    first: Math.min(range.pending, bin),
    last: Math.max(range.pending, bin),
    pending: null,
  };
}

/** The window of the match a range stands for, `null` for the whole round. */
export function windowOfRange(range: RoundRange): HeatWindow | null {
  return heatWindowOfBins(range.first, range.last);
}

export function isWholeRange(range: RoundRange): boolean {
  return range.pending === null && isWholeRound(range.first, range.last);
}

/** The window *Play round* is on at a step: ten seconds, moved on by five each time. */
export function playRange(step: number): RoundRange {
  return { first: step, last: step + PLAY_WINDOW_BINS - 1, pending: null };
}

/** Seconds as the round's own clock reads them: `1:05`. Digits, so nothing to translate. */
export function clockOf(seconds: number): string {
  const whole = Math.max(Math.floor(seconds), 0);

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The seconds a step of the axis starts at. */
export function binStartSeconds(bin: number): number {
  return bin * HEAT_BIN_SECONDS;
}
