import type { RoundWindow } from '@disa/demo-core';

/** Where a tick sits on the strip, 0 at the left end and 1 at the right. */
export function windowFraction(bounds: RoundWindow, tick: number): number {
  const length = bounds.endTick - bounds.startTick;
  if (length <= 0) return 0;
  return Math.min(1, Math.max(0, (tick - bounds.startTick) / length));
}

/** `m:ss` from the moment the round went live. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Which way an arrow key moves an edge: later (1), earlier (-1) or not at all (0). */
export function keyDirection(key: string): -1 | 0 | 1 {
  if (key === 'ArrowRight' || key === 'ArrowUp') return 1;
  if (key === 'ArrowLeft' || key === 'ArrowDown') return -1;
  return 0;
}
