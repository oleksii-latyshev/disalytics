import { useEffect, useRef } from 'react';
import { paintLayers } from '@/core/renderer';
import type { RadarColors } from '../helpers/colors';
import { readLabelStyle } from '../helpers/labels';
import { MARK_HEIGHT_PX, MARK_WIDTH_PX, type PlateMark } from '../helpers/plate-legend';

interface Props {
  mark: PlateMark;
  colors: RadarColors;
}

/**
 * One mark of the help sheet's legend, on a canvas because that is what the plate is: a mark
 * reproduced in DOM would be a second drawing of it, and a second drawing is the drift the legend
 * exists to prevent.
 *
 * It is drawn once, when the sheet's tree mounts, rather than when the sheet opens — a swatch is
 * 56×28 and there are seventeen of them, so the cheapest moment to pay for them is the one nobody
 * is waiting on.
 */
export function PlateMarkSwatch({ mark, colors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    // Resolved here rather than inside the draw, the way the colours are: a mark reads no CSS.
    const style = readLabelStyle();

    paintLayers(canvas, [(context) => mark.draw(context, colors, style)], {
      width: MARK_WIDTH_PX,
      height: MARK_HEIGHT_PX,
    });
  }, [mark, colors]);

  return (
    // The row's own text is the reading; the picture beside it says nothing a reader without it
    // would miss, which is what §14 asks of every canvas in the product. The wrapper carries the
    // hiding rather than the canvas: a canvas is focusable content, and ARIA on one of those is
    // how a keyboard reaches something no reader is ever told about.
    //
    // It also carries the **plate's own ground**, and that is not decoration. A mark's halo and the
    // hollow in a walking token are both drawn in `--color-surface-0`, so a specimen floating on the
    // sheet — which is 72% of that colour over a blurred screen — draws its own background as a dark
    // shape. On the ground it was drawn for, a halo disappears the way it does on the plate.
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-chip border border-line bg-surface-0 p-1"
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${MARK_WIDTH_PX}px`, height: `${MARK_HEIGHT_PX}px` }}
        className="block"
      />
    </span>
  );
}
