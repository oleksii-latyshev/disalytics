import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { type Layer, paintLayers } from '../helpers/canvas';

export interface CanvasLayers {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /**
   * Paints the layers given most recently. Its identity holds across renders, so a per-frame caller
   * can subscribe once and keep it.
   */
  repaint: () => void;
}

/**
 * Binds an ordered set of layers to a canvas, painting when they change and when the element is
 * resized. The array is an effect dependency, so callers hold it steady across renders.
 */
export function useCanvasLayers(layers: readonly Layer[]): CanvasLayers {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layersRef = useRef(layers);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    paintLayers(canvas, layersRef.current);
  }, []);

  useEffect(() => {
    layersRef.current = layers;

    const canvas = canvasRef.current;
    if (canvas === null) return;

    repaint();

    const observer = new ResizeObserver(repaint);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [layers, repaint]);

  return { canvasRef, repaint };
}
