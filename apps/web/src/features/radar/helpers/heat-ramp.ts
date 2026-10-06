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
const TINT = 0.55;

/** A colour at a position along the ramp, 0 for its coolest end and 1 for its hottest. */
type Stop = readonly [position: number, colour: Rgb];

function evenly(colours: readonly Rgb[]): readonly Stop[] {
  const last = colours.length - 1;

  return colours.map((colour, at): Stop => [at / last, colour]);
}

/** A ramp through `stops`, which are in order and run from 0 to 1. */
function rampThrough(stops: readonly Stop[]): HeatRamp {
  const ramp = new Uint8ClampedArray(RAMP_STEPS * CHANNELS);

  for (let step = 0; step < RAMP_STEPS; step++) {
    const position = step / (RAMP_STEPS - 1);
    const upper = Math.max(
      stops.findIndex((stop) => stop[0] >= position),
      1,
    );
    const from = stops[upper - 1];
    const to = stops[upper];
    if (from === undefined || to === undefined) continue;

    const span = to[0] - from[0];
    ramp.set(mix(from[1], to[1], span === 0 ? 1 : (position - from[0]) / span), step * CHANNELS);
  }

  return ramp;
}

/** A single hue read from dark to light: its own colour in the middle, which is where it is told. */
function identityRamp(hex: string): HeatRamp {
  const base = rgbOf(hex);

  return rampThrough(evenly([mix(base, BLACK, SHADE), base, mix(base, WHITE, TINT)]));
}

/** Where the field ramp is its green and its yellow; past the yellow it is pale and only then white. */
const FIELD_GREEN = 0.38;
const FIELD_YELLOW = 0.78;
const FIELD_PALE = 0.9;

/**
 * The three ramps a heat picture is drawn in. A player's field climbs through green to the yellow
 * the first compared player is, which is where ordinary hot ground stops: only the last few percent
 * of the ramp go on to white, and the ceiling is read so that is the top of the lit ground. Each compared player keeps one hue from the dark end
 * to the light one, which is what lets a reader find whose time a patch of ground was after the
 * two plates are shown as one.
 */
export function heatRamps(heat: RadarColors['heat']): Readonly<Record<HeatIdentity, HeatRamp>> {
  const low = rgbOf(heat.low);
  const high = rgbOf(heat.high);

  return {
    field: rampThrough([
      [0, mix(low, BLACK, 0.42)],
      [FIELD_GREEN, low],
      [FIELD_YELLOW, high],
      [FIELD_PALE, high],
      [1, WHITE],
    ]),
    first: identityRamp(heat.high),
    second: identityRamp(heat.second),
  };
}

/** The ramp's colour at a weight in 0..1, as an index of its first byte. */
export function rampIndex(weight: number): number {
  return Math.round(Math.min(Math.max(weight, 0), 1) * (RAMP_STEPS - 1)) * CHANNELS;
}
