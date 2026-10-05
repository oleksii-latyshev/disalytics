import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import type { HeatDifference } from './heat-difference';
import { DIFFERENCE_CUT } from './heat-difference';
import type { HeatField, HeatRings } from './heat-field';
import { type HeatIdentity, type HeatRamp, heatRamps, rampIndex } from './heat-ramp';
import { type PlateSize, type PlateView, plateGeometry, readPlateGeometry } from './view';

/**
 * Weights below this share of the ramp are not drawn. A faint value is a place somebody passed once,
 * and a field that counts it ends up a haze over the whole map with the real holds lost in it.
 */
const FAINT_WEIGHT = 0.03;

/** How steeply the ramp climbs: below one, so that a modest weight is already clearly a colour. */
const RAMP_CURVE = 0.45;
const DIFFERENCE_CURVE = 0.5;

/** A bin is drawn at least this opaque and at most fully so. */
const ALPHA_FLOOR = 0.45;
const ALPHA_SPAN = 1 - ALPHA_FLOOR;
const BYTE = 255;
const CHANNELS = 4;

function paintingCanvas(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (context === null) throw new Error('The browser gave no 2D context for the heat field.');

  return context;
}

function writePixel(data: Uint8ClampedArray, bin: number, ramp: HeatRamp, weight: number): void {
  const pixel = bin * CHANNELS;
  const from = rampIndex(weight);

  data[pixel] = ramp[from] ?? 0;
  data[pixel + 1] = ramp[from + 1] ?? 0;
  data[pixel + 2] = ramp[from + 2] ?? 0;
  data[pixel + 3] = Math.round((ALPHA_FLOOR + ALPHA_SPAN * weight) * BYTE);
}

/**
 * The field as an image the size of its own grid, painted once and then scaled onto the plate.
 *
 * The field arrives already smoothed by its kernel (#384), and a bin is about two plate pixels at
 * the plate's largest, so the scale is a resample of a smooth picture rather than the thing doing
 * the smoothing. Blurring the plate at draw time would spend a filter pass on every repaint.
 */
export function fieldImage(
  field: HeatField,
  colors: RadarColors,
  identity: HeatIdentity,
): HTMLCanvasElement {
  const context = paintingCanvas(field.width, field.height);
  const image = context.createImageData(field.width, field.height);
  const ramp = heatRamps(colors.heat)[identity];

  for (let bin = 0; bin < field.bins.length; bin++) {
    const weight = field.bins[bin] ?? 0;
    if (weight < FAINT_WEIGHT) continue;

    writePixel(image.data, bin, ramp, weight ** RAMP_CURVE);
  }

  context.putImageData(image, 0, 0);

  return context.canvas;
}

/** Where the first player spends more of their time in the first player's colour, the other's in the second's. */
export function differenceImage(
  difference: HeatDifference,
  colors: RadarColors,
): HTMLCanvasElement {
  const context = paintingCanvas(difference.width, difference.height);
  const image = context.createImageData(difference.width, difference.height);
  const ramps = heatRamps(colors.heat);

  for (let bin = 0; bin < difference.bins.length; bin++) {
    const delta = difference.bins[bin] ?? 0;
    if (Math.abs(delta) < DIFFERENCE_CUT) continue;

    writePixel(
      image.data,
      bin,
      delta > 0 ? ramps.first : ramps.second,
      Math.abs(delta) ** DIFFERENCE_CURVE,
    );
  }

  context.putImageData(image, 0, 0);

  return context.canvas;
}

export interface HeatLayerOptions {
  readonly image: HTMLCanvasElement;
  readonly plate: PlateSize;
  /** Read at draw time, the way every layer on the plate reads it. */
  readonly view: { readonly current: PlateView };
}

/**
 * Where the match was spent, over the map it was spent on.
 *
 * **Nothing here is a function of time**, for `duelLayer`'s reason: this screen has no clock, so the
 * layer paints when its field changes or the canvas is resized. The draw is one `drawImage` of a
 * picture that was built when the narrowing changed, so it allocates nothing and costs the same at
 * any zoom.
 */
export function heatLayer({ image, plate, view }: HeatLayerOptions): Layer {
  const geometry = plateGeometry();

  return (context, size) => {
    readPlateGeometry(view.current, size, plate, geometry);

    context.drawImage(
      image,
      geometry.offsetX,
      geometry.offsetY,
      geometry.scale * plate.width,
      geometry.scale * plate.height,
    );
  };
}

/** Ring and outline sizes, in plate pixels: a mark is one size however far the plate is zoomed. */
const RING_RADIUS_PX = 9;
const RING_OUTLINE_PX = 5.5;
const RING_LINE_PX = 2.6;
const FULL_TURN = Math.PI * 2;

export interface RingLayerOptions {
  readonly marks: HeatRings;
  readonly plate: PlateSize;
  readonly colour: string;
  /** The dark line round each ring, which keeps it apart from a field of any colour under it. */
  readonly outline: string;
  readonly view: { readonly current: PlateView };
}

/**
 * Where something happened, one ring each — deaths, which are too few to be a field and too exact
 * to be blurred into one.
 *
 * **The draw allocates nothing**: the points were put on the plate when the narrowing changed, and
 * every ring goes into one path that is stroked twice, once dark and wide and once in the colour.
 */
export function ringLayer({ marks, plate, colour, outline, view }: RingLayerOptions): Layer {
  const geometry = plateGeometry();

  return (context, size) => {
    readPlateGeometry(view.current, size, plate, geometry);

    context.beginPath();
    for (let mark = 0; mark < marks.count; mark++) {
      const x = geometry.offsetX + (marks.points[mark * 2] ?? 0) * geometry.scale;
      const y = geometry.offsetY + (marks.points[mark * 2 + 1] ?? 0) * geometry.scale;

      context.moveTo(x + RING_RADIUS_PX, y);
      context.arc(x, y, RING_RADIUS_PX, 0, FULL_TURN);
    }

    context.lineWidth = RING_OUTLINE_PX;
    context.strokeStyle = outline;
    context.stroke();

    context.lineWidth = RING_LINE_PX;
    context.strokeStyle = colour;
    context.stroke();
  };
}
