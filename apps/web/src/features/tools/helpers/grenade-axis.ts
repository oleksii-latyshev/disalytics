import type { GrenadeReference } from '@disa/demo-core';

export const AXIS_MAX_SECONDS = 25;
export const AXIS_TICK_SECONDS: readonly number[] = [0, 5, 10, 15, 20, 25];
export const RING_MAX_UNITS = 350;

/** Where a duration ends on the shared axis, 0–1; an instant grenade (no duration) is 0. */
export function axisFraction(seconds: number | null): number {
  if (seconds === null || seconds <= 0) return 0;
  return Math.min(seconds, AXIS_MAX_SECONDS) / AXIS_MAX_SECONDS;
}

/** A radius as a share of the widest reach in the reference (the HE), 0–1. */
export function ringFraction(units: number): number {
  if (units <= 0) return 0;
  return Math.min(units, RING_MAX_UNITS) / RING_MAX_UNITS;
}

/** Longest-lasting first; instant ones last, ties keep their reference order. */
export function sortByDuration(grenades: readonly GrenadeReference[]): GrenadeReference[] {
  return grenades
    .map((grenade, index) => ({ grenade, index }))
    .sort(
      (a, b) =>
        (b.grenade.durationSeconds ?? 0) - (a.grenade.durationSeconds ?? 0) || a.index - b.index,
    )
    .map((entry) => entry.grenade);
}
