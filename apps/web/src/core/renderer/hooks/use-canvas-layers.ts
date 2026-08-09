import { type RefObject, useEffect, useRef } from 'react';
import { type Layer, paintLayers } from '../helpers/canvas';

/**
 * Binds an ordered set of layers to a canvas, repainting when they change and when the element is
 * resized. The array is an effect dependency, so callers hold it steady across renders.
 */
export function useCanvasLayers(layers: readonly Layer[]): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const repaint = () => paintLayers(canvas, layers);
    repaint();

    const observer = new ResizeObserver(repaint);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [layers]);

  return canvasRef;
}
