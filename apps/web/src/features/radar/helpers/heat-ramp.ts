import type { RadarColors } from './colors';

const HEX_RADIX = 16;
const CHANNELS = 3;

/** How many steps a ramp is resolved to. A bin's weight is a float and the picture has 8 bits. */
export const RAMP_STEPS = 256;

/** Whose colour a field is drawn in: the match's own reading, or one of two compared players. */
export type HeatIdentity = 'field' | 'first' | 'second';

/** `RAMP_STEPS` colours, `r, g, b` bytes in a row, from the coolest to the hottest. */
export type HeatRamp = Uint8ClampedArray;

type Rgb = readonly [number, number, number];

function channelAt(hex: string, at: number): number {
  return Number.parseInt(hex.slice(at, at + 2), HEX_RADIX);
}

/** A `#rrggbb` token, which is the only form the ramp's tokens are written in. */
function rgbOf(hex: string): Rgb {
  return [channelAt(hex, 1), channelAt(hex, 3), channelAt(hex, 5)];
}

function mix(from: Rgb, to: Rgb, weight: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * weight,
    from[1] + (to[1] - from[1]) * weight,
    from[2] + (to[2] - from[2]) * weight,
  ];
}

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

/** How far an identity's dark end is pulled towards black, and its light end towards white. */
const SHADE = 0.62;
const TINT = 0.82;

/** A ramp through `stops`, evenly spaced. */
function rampThrough(stops: readonly Rgb[]): HeatRamp {
  const ramp = new Uint8ClampedArray(RAMP_STEPS * CHANNELS);
  const last = stops.length - 1;

  for (let step = 0; step < RAMP_STEPS; step++) {
    const position = (step / (RAMP_STEPS - 1)) * last;
    const stop = Math.min(Math.floor(position), last - 1);
    const from = stops[stop];
    const to = stops[stop + 1];
    if (from === undefined || to === undefined) continue;

    const colour = mix(from, to, position - stop);
    ramp.set(colour, step * CHANNELS);
  }

  return ramp;
}

/** A single hue read from dark to light: its own colour in the middle, which is where it is told. */
function identityRamp(hex: string): HeatRamp {
  const base = rgbOf(hex);

  return rampThrough([mix(base, BLACK, SHADE), base, mix(base, WHITE, TINT)]);
}

/**
 * The three ramps a heat picture is drawn in. A player's field climbs through green to the yellow
 * the first compared player is, and to white; each compared player keeps one hue from the dark end
 * to the light one, which is what lets a reader find whose time a patch of ground was after the
 * two plates are shown as one.
 */
export function heatRamps(heat: RadarColors['heat']): Readonly<Record<HeatIdentity, HeatRamp>> {
  const low = rgbOf(heat.low);
  const high = rgbOf(heat.high);

  return {
    field: rampThrough([mix(low, BLACK, 0.42), low, high, WHITE]),
    first: identityRamp(heat.high),
    second: identityRamp(heat.second),
  };
}

/** The ramp's colour at a weight in 0..1, as an index of its first byte. */
export function rampIndex(weight: number): number {
  return Math.round(Math.min(Math.max(weight, 0), 1) * (RAMP_STEPS - 1)) * CHANNELS;
}
