import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  canPan,
  clampView,
  DOUBLE_CLICK_ZOOM,
  FITTED,
  MIN_ZOOM,
  type Size,
  wheelZoom,
  ZOOM_STEP,
  type ZoomView,
  zoomAt,
} from '../helpers/shot-zoom';

interface Drag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly from: ZoomView;
}

const NO_SIZE: Size = { width: 0, height: 0 };

/**
 * Zoom and pan for one screenshot at a time, keyed by `shotKey`: a new screenshot starts fitted.
 *
 * The view lives in a ref and is written to the image's `style.transform` directly — a drag moves it
 * every frame, and none of that is React's business. Only the zoom, which the controls print, is
 * state, and it changes on a wheel notch or a press, never on a move.
 */
export function useShotZoom(shotKey: string) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  // The frame is also state: the dialog's content mounts in a portal after the hook's first effects
  // have run, and a screenshot can appear later still (a position without one has no frame), so the
  // wheel and resize listeners are attached when the element arrives rather than on mount.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const attachFrame = useCallback((node: HTMLDivElement | null) => {
    frameRef.current = node;
    setFrame(node);
  }, []);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<ZoomView>(FITTED);
  const dragRef = useRef<Drag | null>(null);
  const frameRequest = useRef<number | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [isDragging, setIsDragging] = useState(false);
  const [hasZoomed, setHasZoomed] = useState(false);

  const sizes = useCallback((): { frame: Size; image: Size } => {
    const frame = frameRef.current;
    const image = imageRef.current;
    return {
      frame: frame === null ? NO_SIZE : { width: frame.clientWidth, height: frame.clientHeight },
      image: image === null ? NO_SIZE : { width: image.naturalWidth, height: image.naturalHeight },
    };
  }, []);

  const paint = useCallback(() => {
    frameRequest.current = null;
    const image = imageRef.current;
    const { zoom: scale, x, y } = viewRef.current;
    if (image !== null) image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  const show = useCallback(
    (view: ZoomView) => {
      viewRef.current = view;
      setZoom(view.zoom);
      if (frameRequest.current === null) frameRequest.current = requestAnimationFrame(paint);
    },
    [paint],
  );

  /** Zooms to `next`, about `point` (from the frame's top-left) or the frame's centre. */
  const zoomTo = useCallback(
    (next: number, point?: { readonly x: number; readonly y: number }) => {
      const { frame, image } = sizes();
      const fromCentre =
        point === undefined
          ? undefined
          : { x: point.x - frame.width / 2, y: point.y - frame.height / 2 };
      show(zoomAt(viewRef.current, next, frame, image, fromCentre));
      if (next > MIN_ZOOM) setHasZoomed(true);
    },
    [show, sizes],
  );

  const zoomBy = useCallback(
    (direction: 1 | -1) => zoomTo(viewRef.current.zoom + direction * ZOOM_STEP),
    [zoomTo],
  );
  const reset = useCallback(() => show(FITTED), [show]);

  // A new screenshot or position starts fitted; `shotKey` is the dependency on purpose.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key is what resets the view.
  useEffect(() => {
    dragRef.current = null;
    setIsDragging(false);
    show(FITTED);
  }, [shotKey, show]);

  useEffect(() => {
    if (frame === null) return;

    // Not passive, so the page behind the dialog does not scroll while the photo zooms; a trackpad
    // pinch arrives as a wheel with `ctrlKey`, which this treats the same.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = frame.getBoundingClientRect();
      zoomTo(wheelZoom(viewRef.current.zoom, event.deltaY), {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      });
    };
    const observer = new ResizeObserver(() => {
      const { frame: frameSize, image } = sizes();
      show(clampView(viewRef.current, frameSize, image));
    });

    frame.addEventListener('wheel', onWheel, { passive: false });
    observer.observe(frame);

    return () => {
      frame.removeEventListener('wheel', onWheel);
      observer.disconnect();
      if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
      frameRequest.current = null;
    };
  }, [frame, show, sizes, zoomTo]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const { frame, image } = sizes();
    if (!canPan(viewRef.current, frame, image)) return;

    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      from: viewRef.current,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;

    const { frame, image } = sizes();
    viewRef.current = clampView(
      {
        zoom: drag.from.zoom,
        x: drag.from.x + event.clientX - drag.startX,
        y: drag.from.y + event.clientY - drag.startY,
      },
      frame,
      image,
    );
    if (frameRequest.current === null) frameRequest.current = requestAnimationFrame(paint);
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const onDoubleClick = (event: { clientX: number; clientY: number }) => {
    const frame = frameRef.current;
    if (frame === null) return;
    if (viewRef.current.zoom > MIN_ZOOM) {
      reset();
      return;
    }
    const box = frame.getBoundingClientRect();
    zoomTo(DOUBLE_CLICK_ZOOM, { x: event.clientX - box.left, y: event.clientY - box.top });
  };

  /** Re-fits once the image knows its size, which it does not until it has loaded. */
  const onImageLoad = () => {
    const { frame, image } = sizes();
    show(clampView(viewRef.current, frame, image));
  };

  return {
    frameRef: attachFrame,
    imageRef,
    zoom,
    isDragging,
    hasZoomed,
    zoomBy,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onDoubleClick,
    onImageLoad,
  };
}
