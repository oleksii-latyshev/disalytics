import { sampleAt, type Team } from '@disa/demo-core';
import type { Layer } from '@/core/renderer';
import { readCssToken } from '@/shared/lib';
import type { EventDensity } from './density';
import type { EconomyStep } from './economy';
import { MARKER_BAND_PX, type RoundBand, SPINE_AXIS_FRACTION } from './spine';

/** Low enough that a full-height tint reads as the round's outcome rather than as a surface. */
const BAND_ALPHA = 0.1;

/** The playhead is the brightest thing on the strip — `docs/DESIGN.md` §2 — and stays that way. */
const DENSITY_ALPHA = 0.55;

/**
 * Below the density and above the bands in alpha, and quieter than either in what it covers: the
 * trace spikes across the strip's whole upper half, the bands fill its full height, and this reads
 * a fifth of it. A gap that has to be seen against a band tinted the same hue cannot go lower.
 */
const ECONOMY_ALPHA = 0.32;

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

/**
 * The buy, as one step per round in the strip's bottom band: a block rising from the band's centre
 * for a round the CT side out-equipped, falling for one the T side did, as tall as the gap is wide
 * against the widest the match holds.
 *
 * Which side is ahead is carried by the direction the block leaves the centre line, not by the
 * colour it is drawn in — `docs/DESIGN.md` §9 does not let side identity rest on hue.
 */
export function economyGap(steps: readonly EconomyStep[], colors: SpineColors): Layer {
  return (context, size) => {
    if (steps.length === 0) return;

    const top = size.height * SPINE_AXIS_FRACTION + MARKER_BAND_PX;
    const centre = (top + size.height) / 2;
    const reach = size.height - centre;

    context.globalAlpha = ECONOMY_ALPHA;

    for (const step of steps) {
      if (step.leader === null) continue;

      const left = step.startFraction * size.width;
      const height = step.share * reach;

      context.fillStyle = colors.side[step.leader];
      context.fillRect(
        left,
        step.leader === 'CT' ? centre - height : centre,
        step.endFraction * size.width - left,
        height,
      );
    }

    context.globalAlpha = 1;
    context.fillStyle = colors.hairline;
    context.fillRect(0, Math.round(centre), size.width, 1);
  };
}
