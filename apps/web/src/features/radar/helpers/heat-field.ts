import { type HeatMode, type HeatScope, type ParsedDemo, walkHeat } from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';

/**
 * How many bins the map is divided into on each axis — #384. A bin is 2.7 radar pixels, about 12
 * world units on dust2, and two plate pixels at the plate's largest (793 at 1440×900), so the
 * picture is resolved by the kernel below rather than by the grid. It was 128 until #384, and a bin
 * of 8 radar pixels upscaled by `drawImage` read as a low-resolution photograph over the map. 512
 * was measured too and cost presence 10.9 ms against 7.0 for no difference a plate can show.
 */
export const HEAT_GRID = 384;

/**
 * The kernel: three passes of a box `2 × BLUR_RADIUS + 1` bins wide, which is a Gaussian to within a
 * few percent at a cost that does not grow with its width. Radius 2 gives σ ≈ 2.4 bins ≈ 29 world
 * units — a player's own width — so a corridor keeps its walls and a hold is a spot rather than a
 * room. Radius 3 was drawn beside it on the dust2 sample and ran neighbouring deaths into one blob.
 */
const BLUR_RADIUS = 2;
const BLUR_PASSES = 3;

/** Where the ramp's hot end sits in the lit bins' own distribution. Everything past it saturates. */
const HOT_QUANTILE = 0.95;

/**
 * A bin is lit when the kernel leaves it more than this share of the densest bin. The kernel's own
 * tails otherwise count as ground, and the ceiling would be read over a field mostly made of them.
 */
const LIT_SHARE = 0.002;

/** Resolution of the histogram the ceiling is read from, instead of sorting a quarter-million bins. */
const HISTOGRAM_BUCKETS = 4096;

export interface HeatField {
  /** `HEAT_GRID²` weights in 0..1, row-major, `HOT_QUANTILE` of the lit ground and above at 1. */
  readonly bins: Float32Array;
  /** Each slot's figure inside the side scope (`HeatTally.bySlot`). */
  readonly bySlot: Float32Array;
  /** The figure the field itself is made of. */
  readonly total: number;
}

/**
 * One pass of a box blur along one axis, from `source` into `target`.
 *
 * The hot loops here and below index the typed arrays directly rather than through `sampleAt`: its
 * bounds check, through an `ArrayLike`, was half of the field's build time (#384), and every index
 * here is inside the grid by construction.
 */
function boxPass(
  source: Float32Array,
  target: Float32Array,
  stride: number,
  step: number,
  lines: number,
): void {
  const width = 2 * BLUR_RADIUS + 1;

  for (let line = 0; line < lines; line++) {
    const origin = line * stride;
    let sum = 0;

    // The window starts centred on the first bin with its left half off the grid, which is empty.
    for (let at = 0; at <= BLUR_RADIUS; at++) sum += source[origin + at * step] ?? 0;

    for (let at = 0; at < HEAT_GRID; at++) {
      target[origin + at * step] = sum / width;

      const entering = at + BLUR_RADIUS + 1;
      const leaving = at - BLUR_RADIUS;
      if (entering < HEAT_GRID) sum += source[origin + entering * step] ?? 0;
      if (leaving >= 0) sum -= source[origin + leaving * step] ?? 0;
    }
  }
}

/** Blurs `bins` in place, using `scratch` for the half-way pass. */
function blur(bins: Float32Array, scratch: Float32Array): void {
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    // Along rows: each row starts at `row * HEAT_GRID` and walks by 1.
    boxPass(bins, scratch, HEAT_GRID, 1, HEAT_GRID);
    // Along columns: each column starts at `column` and walks by a row.
    boxPass(scratch, bins, 1, HEAT_GRID, HEAT_GRID);
  }
}

/** The weight the ramp's hot end stands at, over the lit bins. */
function hotCeiling(bins: Float32Array): number {
  let peak = 0;
  for (let bin = 0; bin < bins.length; bin++) peak = Math.max(peak, bins[bin] ?? 0);
  if (peak === 0) return 0;

  const floor = peak * LIT_SHARE;
  const histogram = new Uint32Array(HISTOGRAM_BUCKETS);
  let lit = 0;

  for (let bin = 0; bin < bins.length; bin++) {
    const weight = bins[bin] ?? 0;
    if (weight <= floor) continue;

    const bucket = Math.min(Math.floor((weight / peak) * HISTOGRAM_BUCKETS), HISTOGRAM_BUCKETS - 1);
    histogram[bucket] = (histogram[bucket] ?? 0) + 1;
    lit++;
  }

  const wanted = Math.floor(lit * HOT_QUANTILE);
  let seen = 0;

  for (let bucket = 0; bucket < HISTOGRAM_BUCKETS; bucket++) {
    seen += histogram[bucket] ?? 0;
    if (seen > wanted) return ((bucket + 1) / HISTOGRAM_BUCKETS) * peak;
  }

  return peak;
}

/**
 * One heat map mode as a picture's worth of weights — `walkHeat`'s points binned onto the radar
 * image, smoothed, and scaled to a ramp.
 *
 * **The field has no level.** A whole match stands on every floor the map has, so every point is
 * binned where it stands on the plan and a two-storey map reads as both floors at once.
 *
 * **The ramp tops out at a quantile rather than at the densest bin**, #366's reason: a match's time
 * is spent very unevenly, and against the peak alone half the ground is a tenth of the ramp. The
 * quantile is read after the kernel, over bins it left more than `LIT_SHARE` of the peak.
 */
export function heatField(
  demo: ParsedDemo,
  overview: MapOverview,
  mode: HeatMode,
  scope: HeatScope,
): HeatField {
  const bins = new Float32Array(HEAT_GRID * HEAT_GRID);
  const binScale = HEAT_GRID / RADAR_IMAGE_SIZE;

  const tally = walkHeat(demo, mode, scope, (worldX, worldY, weight) => {
    const x = Math.floor(radarX(overview, worldX) * binScale);
    const y = Math.floor(radarY(overview, worldY) * binScale);
    if (x < 0 || y < 0 || x >= HEAT_GRID || y >= HEAT_GRID) return;

    const bin = y * HEAT_GRID + x;
    bins[bin] = (bins[bin] ?? 0) + weight;
  });

  blur(bins, new Float32Array(bins.length));

  const ceiling = hotCeiling(bins);
  for (let bin = 0; ceiling > 0 && bin < bins.length; bin++) {
    bins[bin] = Math.min((bins[bin] ?? 0) / ceiling, 1);
  }

  return { bins, bySlot: tally.bySlot, total: tally.total };
}
