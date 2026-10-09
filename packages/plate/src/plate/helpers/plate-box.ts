import type { PlateSize } from './view';

export interface PlateBox {
  /** The canvas's own size at rest: the largest box of the layout's shape the cell can hold. */
  readonly style: { readonly aspectRatio: string; readonly width: string };
  /** The same box's two sides as CSS lengths, for anything that floats against its corner. */
  readonly width: string;
  readonly height: string;
}

/**
 * The plate is never cropped or letterboxed — DESIGN.md §4 — so it takes the largest box of its
 * own shape that a `container-type: size` cell offers, which is what the container units read.
 * A square plate is `min(100cqi,100cqb)` on both sides.
 */
export function plateBox(plate: PlateSize): PlateBox {
  const width = `min(100cqi, ${(plate.width / plate.height) * 100}cqb)`;

  return {
    style: { aspectRatio: `${plate.width} / ${plate.height}`, width },
    width,
    height: `calc(${width} * ${plate.height / plate.width})`,
  };
}
