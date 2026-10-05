import { HEAT_BINS, heatBinOf, type PlayerSlot } from '@disa/demo-core';
import { type MapOverview, plateX, plateY } from '@disa/map-data';
import {
  BIN_SCALE,
  blur,
  gridOf,
  type HeatField,
  type HeatSource,
  scaleToRamp,
} from './heat-field';

/**
 * A reading cut into the steps of the round-time axis, so that *Play round* can move a window over
 * it without walking the match again: one grid of weights per step, each smoothed the first time it
 * is asked for, and a window is the sum of the smoothed grids it covers.
 *
 * **The kernel is linear**, which is what makes that sum the field the window would have given. A
 * step costs one smoothing of the one grid that is new to it, and nothing is allocated: the sums go
 * into buffers made with the grids and rewritten each time.
 */
export interface HeatBins {
  readonly width: number;
  readonly height: number;
  readonly slotCount: number;
  /** Raw weights until `blurred[bin]`, smoothed ones after. */
  readonly grids: readonly Float32Array[];
  readonly blurred: boolean[];
  /** `HEAT_BINS × slotCount` figures of every player, the way `HeatTally.bySlot` is one. */
  readonly bySlot: Float32Array;
  /** The figure of the subject's own marks in each step. */
  readonly totals: Float32Array;
  readonly scratch: Float32Array;
  readonly density: Float32Array;
  readonly shown: Float32Array;
  readonly figures: Float32Array;
}

/**
 * One walk of every player's marks, from which the subject's go onto the grids.
 * `subject` is `null` for everyone; `source` must not narrow by subject.
 */
export function heatBinsOf(
  overview: MapOverview,
  source: HeatSource,
  subject: PlayerSlot | null,
  slotCount: number,
): HeatBins {
  const { width, height } = gridOf(overview);
  const grids = Array.from({ length: HEAT_BINS }, () => new Float32Array(width * height));
  const bySlot = new Float32Array(HEAT_BINS * slotCount);
  const totals = new Float32Array(HEAT_BINS);

  source((worldX, worldY, worldZ, weight, mark) => {
    const step = heatBinOf(mark.seconds);
    const at = step * slotCount + mark.slot;
    bySlot[at] = (bySlot[at] ?? 0) + weight;
    if (subject !== null && mark.slot !== subject) return;

    totals[step] = (totals[step] ?? 0) + weight;
    const x = Math.floor(plateX(overview, worldX, worldZ) * BIN_SCALE);
    const y = Math.floor(plateY(overview, worldY, worldZ) * BIN_SCALE);
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const grid = grids[step];
    if (grid !== undefined) grid[y * width + x] = (grid[y * width + x] ?? 0) + weight;
  });

  const size = width * height;

  return {
    width,
    height,
    slotCount,
    grids,
    blurred: grids.map(() => false),
    bySlot,
    totals,
    scratch: new Float32Array(size),
    density: new Float32Array(size),
    shown: new Float32Array(size),
    figures: new Float32Array(slotCount),
  };
}

/** Smooths one step's grid, once. */
export function warmBin(bins: HeatBins, step: number): void {
  const grid = bins.grids[step];
  if (grid === undefined || bins.blurred[step] === true) return;

  blur(grid, bins.scratch, bins.width, bins.height);
  bins.blurred[step] = true;
}

/**
 * The field of steps `first`…`last`. **Its arrays are the bins' own and are rewritten by the next
 * call**: the picture is painted from them at once, which is the only time they are read.
 */
export function heatFieldOfBins(bins: HeatBins, first: number, last: number): HeatField {
  const { density, shown, figures, slotCount } = bins;
  density.fill(0);
  figures.fill(0);
  let total = 0;

  for (let step = first; step <= last; step++) {
    warmBin(bins, step);
    const grid = bins.grids[step];
    if (grid === undefined) continue;

    for (let at = 0; at < density.length; at++) density[at] = (density[at] ?? 0) + (grid[at] ?? 0);
    for (let slot = 0; slot < slotCount; slot++) {
      figures[slot] = (figures[slot] ?? 0) + (bins.bySlot[step * slotCount + slot] ?? 0);
    }
    total += bins.totals[step] ?? 0;
  }

  shown.set(density);
  scaleToRamp(shown);

  return { width: bins.width, height: bins.height, bins: shown, density, bySlot: figures, total };
}
