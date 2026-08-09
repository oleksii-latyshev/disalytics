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
 */
export function paintLayers(canvas: HTMLCanvasElement, layers: readonly Layer[]): void {
  const { width, height } = canvas.getBoundingClientRect();
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

  const size: CanvasSize = { width, height };

  for (const layer of layers) {
    context.save();
    layer(context, size);
    context.restore();
  }
}
