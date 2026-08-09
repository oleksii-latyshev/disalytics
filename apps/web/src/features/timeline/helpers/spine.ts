import { frameForTick, lastFrame, type ParsedDemo } from '@disa/demo-core';

export interface RoundBoundary {
  readonly round: number;
  /** Where the round starts, as a fraction of the match in [0, 1]. */
  readonly fraction: number;
}

/** Where the playhead sits along a strip of `widthPx`, for a clock standing at `frame`. */
export function positionOnSpine(frame: number, end: number, widthPx: number): number {
  if (end <= 0) return 0;

  const fraction = frame / end;

  return (fraction < 0 ? 0 : fraction > 1 ? 1 : fraction) * widthPx;
}

/** One hairline per round start. A demo with no samples has nothing to place them against. */
export function roundBoundaries(demo: ParsedDemo): readonly RoundBoundary[] {
  const end = lastFrame(demo.track);
  if (end === 0) return [];

  return demo.events.rounds.map((round) => ({
    round: round.number,
    fraction: frameForTick(demo.track, round.startTick) / end,
  }));
}
