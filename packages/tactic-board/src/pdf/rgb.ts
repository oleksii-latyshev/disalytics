import type { Palette } from '@disa/plate';
import { slotColors } from '../helpers/tactic-colors';
import type { Rgb } from './layout';

/** A CSS colour as the red, green and blue a PDF is written with, read through a canvas pixel. */
function rgbOf(css: string, context: CanvasRenderingContext2D): Rgb {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);
  const { data } = context.getImageData(0, 0, 1, 1);
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
}

/** The reader's five slot colours, ready for a PDF. */
export function slotColorsRgb(palette: Palette): readonly Rgb[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) return [];
  return slotColors(palette).map((css) => rgbOf(css, context));
}
