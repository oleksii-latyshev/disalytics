const CURVE_STEPS = 1024;
const BYTE = 255;

/** `weight ** curve` for a weight in 0..1, tabulated: a power per bin was most of a repaint. */
export function curveTable(curve: number): Float32Array {
  return Float32Array.from({ length: CURVE_STEPS + 1 }, (_, at) => (at / CURVE_STEPS) ** curve);
}

/** A tabulated curve at a weight, which is clamped to 0..1. */
export function curved(table: Float32Array, weight: number): number {
  return table[Math.round(Math.min(Math.max(weight, 0), 1) * CURVE_STEPS)] ?? 0;
}

/**
 * Below this share of the ramp a bin is not drawn. A faint value is a place somebody passed once,
 * and a field that counts it ends up a haze over the whole map with the real holds lost in it.
 */
export const FAINT_WEIGHT = 0.025;

/** The most opaque a bin gets, and how slowly opacity follows weight: the map shows under cool ground. */
const ALPHA_PEAK = 0.9;
const ALPHA_CURVE = 0.85;

const ALPHA_TABLE = Uint8ClampedArray.from(
  Float32Array.from({ length: CURVE_STEPS + 1 }, (_, at) =>
    Math.round(ALPHA_PEAK * (at / CURVE_STEPS) ** ALPHA_CURVE * BYTE),
  ),
);

/**
 * A bin's opacity as a byte. It is zero at the faint end and reaches its peak only at the hot
 * ceiling, so the radar stays legible under cool ground and a hot spot is the one thing that hides it.
 */
export function alphaOf(weight: number): number {
  return ALPHA_TABLE[Math.round(Math.min(Math.max(weight, 0), 1) * CURVE_STEPS)] ?? 0;
}

/** The hatch: stripes this many bins wide, running at 45 degrees, and how much of a stripe's gap is left. */
const HATCH_PERIOD = 6;
const HATCH_GAP = 0.3;

/**
 * What a hatched field keeps of a bin's opacity at a column and a row: all of it on a stripe and a
 * third of it in the gap. A compared player drawn this way is told from the other by their texture
 * as well as by their hue (§17 rule 4), and the ground under a stripe's gap still shows the other.
 */
export function hatchFactor(column: number, row: number): number {
  return (column + row) % HATCH_PERIOD < HATCH_PERIOD / 2 ? 1 : HATCH_GAP;
}
