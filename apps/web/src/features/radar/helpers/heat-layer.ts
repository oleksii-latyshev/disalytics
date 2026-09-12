import { sampleAt } from '@disa/demo-core';
import { RADAR_IMAGE_SIZE } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { HEAT_GRID, type PresenceField } from './heat-field';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

/** What the densest bin is drawn at. The map underneath has to stay readable through the field. */
const PEAK_ALPHA = 0.82;

const CHANNELS = 4;
const HEX_RADIX = 16;

/** One channel of a `#rrggbb` token, which is the only form the ramp's two tokens are written in. */
function channelAt(hex: string, at: number): number {
  return Number.parseInt(hex.slice(at, at + 2), HEX_RADIX);
}

function mix(from: number, to: number, weight: number): number {
  return Math.round(from + (to - from) * weight);
}

/**
 * The field as an image the size of its own grid, painted once and then scaled onto the plate.
 *
 * The upscale is what smooths it: a bin is about 6 plate pixels across, and the browser's own
 * bilinear filtering between them is a gradient rather than a mosaic. Drawing the bins as rectangles
 * would put a grid the data does not have on the map, and blurring the plate at draw time would
 * spend a filter pass on every repaint to arrive at the same picture.
 */
export function fieldImage(field: PresenceField, colors: RadarColors): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = HEAT_GRID;
  canvas.height = HEAT_GRID;

  const context = canvas.getContext('2d');
  if (context === null) throw new Error('The browser gave no 2D context for the heat field.');

  const image = context.createImageData(HEAT_GRID, HEAT_GRID);
  const { low, high } = colors.heat;

  for (let bin = 0; bin < field.bins.length; bin++) {
    const weight = sampleAt(field.bins, bin);
    if (weight === 0) continue;

    const pixel = bin * CHANNELS;

    image.data[pixel] = mix(channelAt(low, 1), channelAt(high, 1), weight);
    image.data[pixel + 1] = mix(channelAt(low, 3), channelAt(high, 3), weight);
    image.data[pixel + 2] = mix(channelAt(low, 5), channelAt(high, 5), weight);
    image.data[pixel + 3] = Math.round(weight * PEAK_ALPHA * 255);
  }

  context.putImageData(image, 0, 0);

  return canvas;
}

export interface HeatLayerOptions {
  readonly image: HTMLCanvasElement;
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
export function heatLayer({ image, view }: HeatLayerOptions): Layer {
  const geometry = plateGeometry();

  return (context, size) => {
    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);

    const extent = geometry.scale * RADAR_IMAGE_SIZE;

    context.drawImage(image, geometry.offsetX, geometry.offsetY, extent, extent);
  };
}
