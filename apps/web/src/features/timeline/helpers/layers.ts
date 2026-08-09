import { sampleAt, type Team } from '@disa/demo-core';
import type { Layer } from '@/core/renderer';
import { readCssToken } from '@/shared/lib';
import type { EventDensity } from './density';
import { type RoundBand, SPINE_AXIS_FRACTION } from './spine';

/** Low enough that a full-height tint reads as the round's outcome rather than as a surface. */
const BAND_ALPHA = 0.1;

/** The playhead is the brightest thing on the strip — `docs/DESIGN.md` §2 — and stays that way. */
const DENSITY_ALPHA = 0.55;

export interface SpineColors {
  readonly side: Readonly<Record<Team, string>>;
  readonly hairline: string;
  readonly density: string;
}

export function readSpineColors(): SpineColors {
  return {
    side: { CT: readCssToken('--color-ct'), T: readCssToken('--color-t') },
    hairline: readCssToken('--color-line'),
    density: readCssToken('--color-damage'),
  };
}

export function outcomeBands(bands: readonly RoundBand[], colors: SpineColors): Layer {
  return (context, size) => {
    context.globalAlpha = BAND_ALPHA;

    for (const band of bands) {
      const left = band.startFraction * size.width;

      context.fillStyle = colors.side[band.winner];
      context.fillRect(left, 0, band.endFraction * size.width - left, size.height);
    }
  };
}

export function roundHairlines(bands: readonly RoundBand[], colors: SpineColors): Layer {
  return (context, size) => {
    context.fillStyle = colors.hairline;

    for (const band of bands) {
      context.fillRect(Math.round(band.startFraction * size.width), 0, 1, size.height);
    }
  };
}

function peakBetween(perSecond: Float32Array, first: number, last: number): number {
  let peak = 0;

  for (let second = first; second <= last && second < perSecond.length; second++) {
    const value = sampleAt(perSecond, second);
    if (value > peak) peak = value;
  }

  return peak;
}

/**
 * A seismograph of the loud moments: one bar per pixel column, as tall as the loudest second that
 * column covers. Resolving the series against the column rather than the second is what keeps a
 * forty-minute match from collapsing into a smear on a strip a thousand pixels wide.
 */
export function densityTrace(density: EventDensity, colors: SpineColors): Layer {
  return (context, size) => {
    const { perSecond, durationSeconds } = density;
    if (perSecond.length === 0 || durationSeconds <= 0) return;

    const baseline = size.height * SPINE_AXIS_FRACTION;
    const columns = Math.round(size.width);

    context.fillStyle = colors.density;
    context.globalAlpha = DENSITY_ALPHA;
    context.beginPath();

    for (let column = 0; column < columns; column++) {
      const first = Math.floor((column / columns) * durationSeconds);
      const last = Math.floor(((column + 1) / columns) * durationSeconds);
      const peak = peakBetween(perSecond, first, last);

      if (peak === 0) continue;

      context.rect(column, baseline - peak * baseline, 1, peak * baseline);
    }

    context.fill();
  };
}
