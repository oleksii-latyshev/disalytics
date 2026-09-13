import { RADAR_IMAGE_SIZE, type RadarPoint } from '@disa/map-data';
import { type PointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useShortcuts } from '@/core/shortcuts';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  type PlateView,
  panBy,
  radarPointAt,
  resetView,
  ZOOM_STEP,
  zoomAbout,
  zoomByStep,
} from '../helpers/view';
import { wheelIntent } from '../helpers/wheel';

interface Options {
  /** The box the layers draw through. Created by the caller, because the layers read it too. */
  readonly view: RefObject<PlateView>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly repaint: () => void;
  /** DESIGN.md §9.1's `+` and `−` stand down while a sheet is open. */
  readonly isSuspended: boolean;
  /**
   * Where the pointer is over the map. Omitted when nobody is reading it, which is what keeps an
   * idle plate from setting state on every move. Leaving the plate is not reported here: clearing
   * the readout is the readout's business and has to happen whether or not it is switched on.
   */
  readonly onHover?: ((point: RadarPoint) => void) | undefined;
}

export interface PlateNavigation {
  /**
   * A copy of the box's zoom that the `+`/`−` pair reads to know when it has run out of range. A
   * wheel or a pinch only updates it when it reaches or leaves an end of the range.
   */
  readonly zoom: number;
  readonly zoomBy: (factor: number) => void;
  readonly canvasProps: {
    readonly onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onPointerCancel: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onDoubleClick: () => void;
  };
}

/**
 * Everything that moves the reader's view of the plate: the wheel, a trackpad's pinch and two-finger
 * scroll, a drag, a double-click, the `+`/`−` pair and DESIGN.md §9.1's two keys.
 *
 * None of it goes through React. The view lives in the caller's mutable box, so a drag repaints the
 * layers that already exist rather than rebuilding them, and hard rule 4 stays off that path — the
 * `zoom` returned here is a copy for the buttons' disabled state and nothing draws from it.
 */
export function usePlateNavigation({
  view,
  canvasRef,
  repaint,
  isSuspended,
  onHover,
}: Options): PlateNavigation {
  const panRef = useRef({ isPanning: false, x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);

  // Measured in the handler rather than kept in a ref: a pointer event is not the frame path, and
  // the plate's box is the one thing a resize can change without telling this component.
  const zoomBy = useCallback(
    (factor: number) => {
      const box = canvasRef.current?.getBoundingClientRect();
      if (box === undefined || box.width === 0) return;

      zoomByStep(view.current, factor, box);
      setZoom(view.current.zoom);
      repaint();
    },
    [canvasRef, repaint, view],
  );

  // Bound here rather than on the stage: the view they move is this plate's own box, and reaching
  // it from there would mean a second source of truth for the zoom. What this second `useShortcuts`
  // call does not get for free is the stage's suspension, which is why that arrives as an option —
  // a plate that zooms behind an open sheet is the failure this avoids.
  useShortcuts(
    { zoomIn: () => zoomBy(ZOOM_STEP), zoomOut: () => zoomBy(1 / ZOOM_STEP) },
    { isSuspended },
  );

  // Non-passive, because a wheel over the plate zooms or pans instead of scrolling the page and only
  // a `preventDefault` says so. React's own `onWheel` is delegated and cannot promise that, which is
  // why this stays an effect that owns its listeners rather than handlers the JSX spreads.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    // A pinch is dozens of events a second, and the state copy only has to be right at the ends of
    // the range — which is all the `+`/`−` pair and the expansion read — so the render per event a
    // plain `setZoom` would cost is skipped everywhere in between.
    const syncZoom = (): void => {
      const next = view.current.zoom;
      setZoom((shown) =>
        shown <= MIN_ZOOM !== next <= MIN_ZOOM || shown >= MAX_ZOOM !== next >= MAX_ZOOM
          ? next
          : shown,
      );
    };

    const zoomAt = (factor: number, clientX: number, clientY: number): void => {
      const box = canvas.getBoundingClientRect();
      if (box.width === 0) return;

      zoomAbout(view.current, factor, clientX - box.left, clientY - box.top, box);
      syncZoom();
      repaint();
    };

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();

      const intent = wheelIntent(event);
      if (intent.kind === 'zoom') {
        zoomAt(intent.factor, event.clientX, event.clientY);
        return;
      }

      const box = canvas.getBoundingClientRect();
      if (box.width === 0) return;

      panBy(view.current, intent.dx, intent.dy, box);
      repaint();
    };

    // Safari reports a pinch as its own gesture events rather than as `ctrlKey` wheels. `scale` is
    // cumulative from the gesture's start, so each change zooms by its ratio to the last one.
    let gestureScale = 1;
    const handleGestureStart = (event: Event): void => {
      event.preventDefault();
      gestureScale = 1;
    };
    const handleGestureChange = (event: Event): void => {
      event.preventDefault();
      if (!('scale' in event && 'clientX' in event && 'clientY' in event)) return;
      const { scale, clientX, clientY } = event;
      if (typeof scale !== 'number' || typeof clientX !== 'number' || typeof clientY !== 'number') {
        return;
      }

      zoomAt(scale / gestureScale, clientX, clientY);
      gestureScale = scale;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('gesturestart', handleGestureStart);
    canvas.addEventListener('gesturechange', handleGestureChange);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('gesturestart', handleGestureStart);
      canvas.removeEventListener('gesturechange', handleGestureChange);
    };
  }, [canvasRef, repaint, view]);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (view.current.zoom === MIN_ZOOM) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { isPanning: true, x: event.clientX, y: event.clientY };
    // Written straight onto the element: a state change per drag would render the plate's whole
    // component to change a cursor.
    event.currentTarget.dataset.panning = 'true';
  }

  function endPan(event: PointerEvent<HTMLCanvasElement>): void {
    panRef.current.isPanning = false;
    delete event.currentTarget.dataset.panning;
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;

    const pan = panRef.current;
    if (pan.isPanning) {
      panBy(view.current, event.clientX - pan.x, event.clientY - pan.y, box);
      pan.x = event.clientX;
      pan.y = event.clientY;
      repaint();
      return;
    }

    if (onHover === undefined) return;

    // The readout answers for the world under the pointer, so it reads through the same zoom and
    // pan the layers draw with — DESIGN.md §9.2.
    onHover(
      radarPointAt(
        view.current,
        event.clientX - box.left,
        event.clientY - box.top,
        box,
        RADAR_IMAGE_SIZE,
      ),
    );
  }

  function handleDoubleClick(): void {
    resetView(view.current);
    setZoom(MIN_ZOOM);
    repaint();
  }

  return {
    zoom,
    zoomBy,
    canvasProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
      onDoubleClick: handleDoubleClick,
    },
  };
}
