import type { PlatePoint } from '@/features/radar';

export interface MiniMapFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const ASPECT = 16 / 9;
const PAD_X = 140;
const PAD_Y = 120;
const MIN_WIDTH = 320;

/**
 * The part of the plate a small map shows so that every point of a throw is in it with room around
 * it: 16:9, never smaller than a callout's neighbourhood, and slid back inside the plate rather
 * than showing what is past its edge.
 */
export function miniMapFrame(
  points: readonly PlatePoint[],
  plate: { readonly width: number; readonly height: number },
): MiniMapFrame {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const wanted = Math.max(maxX - minX + PAD_X, (maxY - minY + PAD_Y) * ASPECT, MIN_WIDTH);
  const width = Math.min(wanted, plate.width, plate.height * ASPECT);
  const height = width / ASPECT;

  const x = (minX + maxX) / 2 - width / 2;
  const y = (minY + maxY) / 2 - height / 2;

  return {
    x: Math.min(Math.max(x, 0), plate.width - width),
    y: Math.min(Math.max(y, 0), plate.height - height),
    width,
    height,
  };
}
