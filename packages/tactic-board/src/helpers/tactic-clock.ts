/**
 * The plan's playback position, a plain object the animation loop writes and the canvas reads —
 * never React state (AGENTS.md §2 rule 4). `isShown` says the plate draws the plan at `time`
 * instead of the step being edited; it stays true while paused.
 */
export interface TacticClock {
  time: number;
  isPlaying: boolean;
  isShown: boolean;
  speed: number;
}

export const TACTIC_SPEEDS: readonly number[] = [1, 2, 4] as const;

export function createTacticClock(): TacticClock {
  return { time: 0, isPlaying: false, isShown: false, speed: 1 };
}

/** Moves the clock on by real time; true while it still has plan left to play. */
export function advanceTacticClock(clock: TacticClock, elapsedMs: number, total: number): boolean {
  clock.time = Math.min(total, clock.time + (elapsedMs / 1000) * clock.speed);
  return clock.time < total;
}
