/**
 * The colour maths, ported from the reference implementation on #133 — sRGB → linear, WCAG 2.1
 * relative luminance and contrast, and source-over compositing.
 *
 * **Compositing happens in sRGB, not in linear light**, because that is what a browser does with
 * `rgb(… / α)`: the alpha whites in the token layer are blended in the space they are written in,
 * and doing it in linear light produces composites a page never shows.
 */

export interface Rgb {
  /** Channels in 0..1, and alpha with them — an opaque colour carries `1`. */
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const HEX = /^#([0-9a-f]{6})$/i;
const RGB_WITH_ALPHA = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/i;
const BYTE = 255;
const HEX_RADIX = 16;

export function parseColour(value: string): Rgb | null {
  const hex = HEX.exec(value.trim());
  if (hex?.[1] !== undefined) {
    const digits = hex[1];
    const byteAt = (at: number) => Number.parseInt(digits.slice(at, at + 2), HEX_RADIX) / BYTE;

    return { r: byteAt(0), g: byteAt(2), b: byteAt(4), a: 1 };
  }

  const parts = RGB_WITH_ALPHA.exec(value.trim());
  if (parts === null) return null;

  return {
    r: Number(parts[1]) / BYTE,
    g: Number(parts[2]) / BYTE,
    b: Number(parts[3]) / BYTE,
    a: parts[4] === undefined ? 1 : Number(parts[4]),
  };
}

export function toHex(colour: Rgb): string {
  const channel = (value: number) =>
    Math.round(value * BYTE)
      .toString(HEX_RADIX)
      .padStart(2, '0');

  return `#${channel(colour.r)}${channel(colour.g)}${channel(colour.b)}`;
}

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(colour: Rgb): number {
  return 0.2126 * toLinear(colour.r) + 0.7152 * toLinear(colour.g) + 0.0722 * toLinear(colour.b);
}

/** WCAG 2.1 contrast between two opaque colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((first, second) => second - first);

  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

/**
 * Source-over of a translucent colour onto an opaque ground, the way the page composites it.
 *
 * **The result is quantised to whole bytes**, because that is the colour a screen is asked for and
 * the one the token file's composites are written as. Measuring contrast against the unrounded mix
 * instead moves every figure in the interaction table by up to 0.09 — enough to fail a check that
 * was reproducing the file exactly a line earlier.
 */
export function composite(over: Rgb, ground: Rgb): Rgb {
  const mix = (front: number, back: number) =>
    Math.round((over.a * front + (1 - over.a) * back) * BYTE) / BYTE;

  return { r: mix(over.r, ground.r), g: mix(over.g, ground.g), b: mix(over.b, ground.b), a: 1 };
}
