import type { Round, UtilityThrow } from '@disa/demo-core';

/**
 * Calculates whole seconds elapsed in the round from the end of freeze time
 * until the grenade was thrown.
 */
export function throwElapsedSeconds(thrown: UtilityThrow, round: Round, tickRate: number): number {
  if (tickRate <= 0) return 0;
  const elapsedTicks = thrown.grenade.throwTick - round.freezeTimeEndTick;
  return Math.max(0, Math.floor(elapsedTicks / tickRate));
}
