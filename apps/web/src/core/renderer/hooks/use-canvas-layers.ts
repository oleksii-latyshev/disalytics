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
  // Written by the observer and read by every paint, so the per-frame path never measures the DOM.
  const sizeRef = useRef({ width: 0, height: 0 });

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    paintLayers(canvas, layersRef.current, sizeRef.current);
  }, []);

  useEffect(() => {
    layersRef.current = layers;

    const canvas = canvasRef.current;
    if (canvas === null) return;

    repaint();

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry === undefined) return;

      sizeRef.current.width = entry.contentRect.width;
      sizeRef.current.height = entry.contentRect.height;
      repaint();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [layers, repaint]);

  return { canvasRef, repaint };
}
