/** The drawing area in CSS pixels, which is the unit every layer works in. */
export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

export type Layer = (context: CanvasRenderingContext2D, size: CanvasSize) => void;

/**
 * Draws the layers in order, bottom first, onto a backing store sized for the display. Each layer
 * gets the context back in the state it was handed, so one layer's stroke style cannot leak into
 * the next.
 *
 * The size is passed in rather than measured: this runs once per animation frame, and measuring the
 * element there would force a layout and mint a `DOMRect` every frame.
 */
export function paintLayers(
  canvas: HTMLCanvasElement,
  layers: readonly Layer[],
  size: CanvasSize,
): void {
  const { width, height } = size;
  if (width === 0 || height === 0) return;

  const context = canvas.getContext('2d');
  if (context === null) throw new Error('The browser gave no 2D context for the radar canvas.');

  const ratio = window.devicePixelRatio;
  const backingWidth = Math.round(width * ratio);
  const backingHeight = Math.round(height * ratio);

  // Writing either dimension resets the context, transform included, so both happen before the
  // transform is set rather than after it.
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    if (layer === undefined) continue;

    context.save();
    layer(context, size);
    context.restore();
  }
}

/** A horizontal slice of the canvas, as fractions of its height. */
export interface Band {
  readonly top: number;
  readonly height: number;
}

/**
 * Runs a layer inside a horizontal band of the canvas: it is translated to the band's top edge,
 * clipped to it, and handed the band's own size.
 *
 * This is what lets one canvas stack charts that each assume they own their whole surface — a trace
 * that rises from `size.height` rises from the bottom of its band, and a chart that centres on
 * `size.height / 2` centres in its band. Superimposing them all on one surface is what made the
 * 14px ribbon unreadable; the layers themselves were never the problem.
 */
export function inBand(layer: Layer, band: Band): Layer {
  return (context, size) => {
    const height = size.height * band.height;
    if (height <= 0) return;

    context.save();
    context.translate(0, size.height * band.top);

    context.beginPath();
    context.rect(0, 0, size.width, height);
    context.clip();

    layer(context, { width: size.width, height });
    context.restore();
  };
}
