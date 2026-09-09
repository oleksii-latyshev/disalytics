import { PNG } from 'pngjs';

interface Stop {
  at: number;
  rgb: [number, number, number];
}

interface Ramps {
  /** Terrain, from the darkest floor to the brightest wall. */
  readonly terrain: Stop[];
  /**
   * Partially transparent pixels are not terrain — on Nuke's lower level they are the ghost of the
   * floor above, and their whole job is to read *lighter* than what is under them. Flattening them
   * onto the terrain ramp makes them vanish against a dark app background.
   */
  readonly overlay: Stop[];
}

/**
 * A generated theme is a pair of ramps and nothing else, which is what keeps a third one honest:
 * every theme flattens the same terrain through the same window, so two themes cannot disagree
 * about what a wall is.
 *
 * **Both stay desaturated relative to the marks drawn on them.** `blue` is the blue-shifted
 * graphite the redesign chose, held down because CT tokens are blue and a saturated blue map would
 * compete with the one colour that has to read as a side. `cyber` is #339's violet, and it is held
 * down for the same reason one step over: its look puts cyan and lime on the plate, so the plate
 * itself may be the only violet thing on screen but it may not be the *loudest*.
 */
const THEME_RAMPS: Record<GeneratedTheme, Ramps> = {
  blue: {
    terrain: [
      { at: 0.0, rgb: [18, 24, 30] },
      { at: 0.35, rgb: [30, 38, 46] },
      { at: 0.7, rgb: [44, 55, 66] },
      { at: 1.0, rgb: [70, 82, 94] },
    ],
    overlay: [
      { at: 0.0, rgb: [96, 108, 120] },
      { at: 1.0, rgb: [188, 200, 212] },
    ],
  },
  cyber: {
    terrain: [
      { at: 0.0, rgb: [20, 14, 30] },
      { at: 0.35, rgb: [34, 22, 50] },
      { at: 0.7, rgb: [52, 33, 76] },
      { at: 1.0, rgb: [84, 56, 118] },
    ],
    overlay: [
      { at: 0.0, rgb: [116, 96, 140] },
      { at: 1.0, rgb: [206, 188, 226] },
    ],
  },
};

/** Every theme this script writes. `vanilla` is Valve's own and is committed rather than generated. */
export const GENERATED_THEMES = ['blue', 'cyber'] as const;
export type GeneratedTheme = (typeof GENERATED_THEMES)[number];

/**
 * Above this saturation a pixel is a deliberate marker rather than terrain — the bombsite outlines
 * Valve draws in orange and green measure above 0.85, while the tinted floors they sit on stay
 * around 0.5. The markers survive the flattening; losing them would cost the reader the only thing
 * on the image that names a site.
 */
const MARKER_SATURATION = 0.75;

/** Alpha below this is the transparent border outside the playable area. */
const OPAQUE = 16;

/** Percentile the luminance range is stretched from, to spend the ramp on terrain and not on air. */
const CLIP = 0.02;

// Rec. 709 luma.
function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function sample(ramp: Stop[], value: number): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, value));
  const upperIndex = ramp.findIndex((stop) => clamped <= stop.at);
  const lower = ramp[upperIndex - 1];
  const upper = ramp[upperIndex];
  if (lower === undefined || upper === undefined) {
    const edge = upperIndex === 0 ? ramp[0] : ramp[ramp.length - 1];
    if (edge === undefined) throw new Error('an empty ramp has no colour');
    return edge.rgb;
  }

  const span = upper.at - lower.at;
  const t = span === 0 ? 0 : (clamped - lower.at) / span;
  return [
    Math.round(lower.rgb[0] + (upper.rgb[0] - lower.rgb[0]) * t),
    Math.round(lower.rgb[1] + (upper.rgb[1] - lower.rgb[1]) * t),
    Math.round(lower.rgb[2] + (upper.rgb[2] - lower.rgb[2]) * t),
  ];
}

/**
 * The luminance window the terrain actually occupies. Vanilla radars sit in the middle third of the
 * range, so mapping raw luma through the ramp crushes every floor into one colour.
 */
function terrainWindow(data: Buffer): { low: number; high: number } {
  const histogram = new Uint32Array(256);
  let counted = 0;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    if ((data[index + 3] ?? 0) < 255) continue;
    if (saturation(r, g, b) > MARKER_SATURATION) continue;

    const bin = Math.round(luma(r, g, b) * 255);
    histogram[bin] = (histogram[bin] ?? 0) + 1;
    counted += 1;
  }

  if (counted === 0) return { low: 0, high: 1 };

  const at = (fraction: number): number => {
    const target = counted * fraction;
    let seen = 0;
    for (let value = 0; value < histogram.length; value += 1) {
      seen += histogram[value] ?? 0;
      if (seen >= target) return value / 255;
    }
    return 1;
  };

  const low = at(CLIP);
  const high = at(1 - CLIP);
  return high > low ? { low, high } : { low: 0, high: 1 };
}

/**
 * Maps terrain luminance through the ramp, alpha untouched — the transparent border outside the
 * playable area has to stay transparent or the radar becomes a square tile.
 */
export function recolorTo(theme: GeneratedTheme, source: Uint8Array): Uint8Array {
  const ramps = THEME_RAMPS[theme];
  const png = PNG.sync.read(Buffer.from(source));
  const { low, high } = terrainWindow(png.data);
  const span = high - low;

  for (let index = 0; index < png.data.length; index += 4) {
    const r = png.data[index] ?? 0;
    const g = png.data[index + 1] ?? 0;
    const b = png.data[index + 2] ?? 0;
    const alpha = png.data[index + 3] ?? 0;
    if (alpha < OPAQUE) continue;
    if (saturation(r, g, b) > MARKER_SATURATION) continue;

    const ramp = alpha < 255 ? ramps.overlay : ramps.terrain;
    const [nr, ng, nb] = sample(ramp, (luma(r, g, b) - low) / span);
    png.data[index] = nr;
    png.data[index + 1] = ng;
    png.data[index + 2] = nb;
  }

  return new Uint8Array(PNG.sync.write(png));
}
