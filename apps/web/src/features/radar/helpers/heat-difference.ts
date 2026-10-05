import type { HeatField } from './heat-field';

/** Below this share of the largest difference, two fields are the same ground and nothing is drawn. */
export const DIFFERENCE_CUT = 0.06;

export interface HeatDifference {
  readonly width: number;
  readonly height: number;
  /** `width × height` signed weights in -1..1: positive where A spends more, negative where B does. */
  readonly bins: Float32Array;
}

function sumOf(values: Float32Array): number {
  let sum = 0;
  for (let at = 0; at < values.length; at++) sum += values[at] ?? 0;

  return sum;
}

/**
 * Where the first field spends more of its own time than the second, and where less.
 *
 * **Each field is divided by its own sum first**, so what is compared is the share of a player's
 * time a place took rather than the time itself, and a match twice as long does not decide the
 * answer. `null` when either field is empty: with nothing to share out there is nothing to compare.
 */
export function heatDifference(first: HeatField, second: HeatField): HeatDifference | null {
  const firstSum = sumOf(first.density);
  const secondSum = sumOf(second.density);
  if (firstSum === 0 || secondSum === 0) return null;
  if (first.density.length !== second.density.length) return null;

  const bins = new Float32Array(first.density.length);
  let largest = 0;

  for (let bin = 0; bin < bins.length; bin++) {
    const delta = (first.density[bin] ?? 0) / firstSum - (second.density[bin] ?? 0) / secondSum;
    bins[bin] = delta;
    largest = Math.max(largest, Math.abs(delta));
  }

  const scale = largest === 0 ? 0 : 1 / largest;
  for (let bin = 0; bin < bins.length; bin++) bins[bin] = (bins[bin] ?? 0) * scale;

  return { width: first.width, height: first.height, bins };
}

/**
 * How much of the two players' routes lie on the same ground: the smaller of the two shares at
 * every bin, added up, as a share of one. Two identical fields give 1 and two that never meet give 0.
 * `null` when either is empty.
 */
export function routesOverlap(first: HeatField, second: HeatField): number | null {
  const firstSum = sumOf(first.density);
  const secondSum = sumOf(second.density);
  if (firstSum === 0 || secondSum === 0) return null;
  if (first.density.length !== second.density.length) return null;

  let overlap = 0;
  for (let bin = 0; bin < first.density.length; bin++) {
    overlap += Math.min(
      (first.density[bin] ?? 0) / firstSum,
      (second.density[bin] ?? 0) / secondSum,
    );
  }

  return Math.min(overlap, 1);
}
