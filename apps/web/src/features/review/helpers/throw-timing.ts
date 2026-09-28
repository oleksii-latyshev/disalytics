import { type ParsedDemo, type Round, roundClockAtFrame, type UtilityThrow } from '@disa/demo-core';
import { formatClock } from '@/core/playback';

export type TimingScope = 'all' | 'early' | 'mid' | 'late';

/**
 * Calculates whole seconds elapsed in the round from the end of freeze time
 * until the grenade was thrown.
 */
export function throwElapsedSeconds(thrown: UtilityThrow, round: Round, tickRate: number): number {
  if (tickRate <= 0) return 0;
  const elapsedTicks = thrown.grenade.throwTick - round.freezeTimeEndTick;
  return Math.max(0, Math.floor(elapsedTicks / tickRate));
}

/**
 * Checks whether the throw elapsed seconds fall within the chosen timing window:
 * - early: 0–20s
 * - mid: 20–60s
 * - late: 60s+
 */
export function matchesTiming(scope: TimingScope, elapsedSeconds: number): boolean {
  switch (scope) {
    case 'all':
      return true;
    case 'early':
      return elapsedSeconds < 20;
    case 'mid':
      return elapsedSeconds >= 20 && elapsedSeconds < 60;
    case 'late':
      return elapsedSeconds >= 60;
  }
}

/**
 * Formats the throw timing display string:
 * `elapsed / remaining` (e.g., `0:18 / 1:37`), or `elapsed` if countdown is unavailable.
 */
export function formatThrowTiming(
  thrown: UtilityThrow,
  round: Round,
  demo: ParsedDemo,
  format: Intl.NumberFormat,
): string {
  const elapsed = throwElapsedSeconds(thrown, round, demo.track.tickRate);
  const elapsedText = formatClock(format, elapsed);
  const clock = roundClockAtFrame(demo, thrown.frame);

  if (clock === undefined) {
    return elapsedText;
  }

  return `${elapsedText} / ${formatClock(format, clock.seconds)}`;
}
