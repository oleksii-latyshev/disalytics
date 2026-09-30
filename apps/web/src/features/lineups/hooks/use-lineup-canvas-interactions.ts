import { RADAR_IMAGE_SIZE, radarToWorld } from '@disa/map-data';
import { useEffect, useRef } from 'react';
import type { CanvasLayers } from '@/core/renderer';
import {
  type PlateView,
  panBy,
  radarPointAt,
  ZOOM_STEP,
  zoomAbout,
  zoomByStep,
} from '@/features/radar/helpers/view';
import type {
  CanvasNodeDrag,
  CanvasPanDrag,
  ContextMenuData,
  LineupCanvasProps,
} from '../components/lineup-plate-types';
import type { ActiveDragPoint } from '../helpers/lineup-layer';
import { HANDLE_RADIUS_PX } from '../helpers/lineup-plate-hit-testing';
import { findNearestNode } from '../helpers/lineup-plot';
import { useLineupCanvasSelectionInteractions } from './use-lineup-canvas-selection-interactions';

interface InteractionRuntime {
  readonly viewRef: React.MutableRefObject<PlateView>;
  readonly canvasRef: CanvasLayers['canvasRef'];
  readonly repaint: CanvasLayers['repaint'];
  readonly plot: Float32Array;
  readonly setActiveDrag: (drag: ActiveDragPoint | null) => void;
  readonly setHoverWorldPoint: (point: { x: number; y: number } | null) => void;
  readonly setZoom: (zoom: number) => void;
  readonly setCursorStyle: (style: 'grab' | 'grabbing' | 'crosshair' | 'default') => void;
  readonly contextMenu: ContextMenuData | null;
  readonly setContextMenu: (menu: ContextMenuData | null) => void;
}

export function useLineupCanvasInteractions(
  plateProps: LineupCanvasProps,
  runtime: InteractionRuntime,
) {
  const { overview, lineups, mode = 'view', isPlacing = false, onUpdatePoint } = plateProps;
  const {
    viewRef,
    canvasRef,
    repaint,
    plot,
    setActiveDrag,
    setHoverWorldPoint,
    setZoom,
    setCursorStyle,
  } = runtime;

  const dragRef = useRef<CanvasPanDrag | null>(null);
  const pointDragRef = useRef<CanvasNodeDrag | null>(null);
  const suppressClickRef = useRef(false);
  const activeDragRef = useRef<ActiveDragPoint | null>(null);

  useEffect(() => {
    if (mode !== 'view') return;
    dragRef.current = null;
    pointDragRef.current = null;
    activeDragRef.current = null;
    suppressClickRef.current = true;
    setActiveDrag(null);
    setCursorStyle('default');
  }, [mode, setActiveDrag, setCursorStyle]);

  useEffect(() => {
    setCursorStyle(isPlacing ? 'crosshair' : mode === 'view' ? 'default' : 'crosshair');
  }, [isPlacing, mode, setCursorStyle]);

  const canvasSize = () => {
    const box = canvasRef.current?.getBoundingClientRect();
    return box ? { width: box.width, height: box.height } : null;
  };

  const selectionHandlers = useLineupCanvasSelectionInteractions(plateProps, {
    ...runtime,
    canvasSize,
    dragRef,
    pointDragRef,
    suppressClickRef,
  });

  const changeZoom = (factor: number) => {
    const size = canvasSize();
    if (size === null) return;
    zoomByStep(viewRef.current, factor, size);
    setZoom(viewRef.current.zoom);
    repaint();
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const size = canvasSize();
    if (size === null) return;
    const box = event.currentTarget.getBoundingClientRect();
    zoomAbout(
      viewRef.current,
      event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
      event.clientX - box.left,
      event.clientY - box.top,
      size,
    );
    setZoom(viewRef.current.zoom);
    repaint();
  };

  const beginNodeDrag = (
    event: React.PointerEvent<HTMLCanvasElement>,
    point: { readonly x: number; readonly y: number },
    scale: number,
  ) => {
    if (isPlacing || mode !== 'edit') return false;
    const node = findNearestNode(point, plot, lineups, overview, scale, HANDLE_RADIUS_PX);
    if (node === null) return false;
    const targetLineup = lineups[node.lineupIndex];
    if (targetLineup === undefined) return false;

    suppressClickRef.current = true;
    plateProps.onSelectNode?.(node, event.shiftKey || event.ctrlKey || event.metaKey);
    activeDragRef.current = null;
    setActiveDrag(null);
    pointDragRef.current = {
      target: node.target,
      waypointIndex: node.waypointIndex,
      moved: false,
      lineupId: targetLineup.id,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setCursorStyle('grabbing');
    return true;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    suppressClickRef.current = false;
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    const point = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      RADAR_IMAGE_SIZE,
    );
    const extent = Math.min(box.width, box.height);
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;

    if (beginNodeDrag(event, point, scale)) return;
    if (viewRef.current.zoom <= 1) return;
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateNodeDrag = (point: { readonly x: number; readonly y: number }) => {
    const pointDrag = pointDragRef.current;
    if (pointDrag === null) return false;
    pointDrag.moved = true;
    const activePoint = {
      target: pointDrag.target,
      waypointIndex: pointDrag.waypointIndex,
      radarX: Math.max(0, Math.min(RADAR_IMAGE_SIZE, point.x)),
      radarY: Math.max(0, Math.min(RADAR_IMAGE_SIZE, point.y)),
    };
    activeDragRef.current = activePoint;
    setActiveDrag(activePoint);
    repaint();
    return true;
  };

  const updateMapPan = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag === null) return false;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const size = canvasSize();
    if (size === null) return true;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    panBy(viewRef.current, dx, dy, size);
    drag.x = event.clientX;
    drag.y = event.clientY;
    repaint();
    return true;
  };

  const updatePlacementPreview = (point: { readonly x: number; readonly y: number }) => {
    if (!isPlacing || !plateProps.draftOrigin) return;
    const clampedPoint = {
      x: Math.max(0, Math.min(RADAR_IMAGE_SIZE, point.x)),
      y: Math.max(0, Math.min(RADAR_IMAGE_SIZE, point.y)),
    };
    setHoverWorldPoint(radarToWorld(overview, clampedPoint));
    repaint();
  };

  const updateCursor = (point: { readonly x: number; readonly y: number }, scale: number) => {
    if (!isPlacing && mode === 'edit') {
      const node = findNearestNode(point, plot, lineups, overview, scale, HANDLE_RADIUS_PX);
      if (node !== null) {
        setCursorStyle('grab');
        return;
      }
    }
    setCursorStyle(
      isPlacing
        ? 'crosshair'
        : mode === 'view' || viewRef.current.zoom > 1
          ? 'default'
          : 'crosshair',
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    const point = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      RADAR_IMAGE_SIZE,
    );
    const extent = Math.min(box.width, box.height);
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;

    if (updateNodeDrag(point)) return;
    if (updateMapPan(event)) return;
    updatePlacementPreview(point);
    updateCursor(point, scale);
  };

  const finishNodeDrag = () => {
    const pointDrag = pointDragRef.current;
    if (pointDrag === null) return false;

    const latestDrag = activeDragRef.current;
    if (mode === 'edit' && pointDrag.moved && latestDrag !== null && onUpdatePoint !== undefined) {
      const worldPoint = radarToWorld(overview, {
        x: latestDrag.radarX,
        y: latestDrag.radarY,
      });
      onUpdatePoint(pointDrag.lineupId, pointDrag.target, worldPoint, pointDrag.waypointIndex);
    }

    pointDragRef.current = null;
    activeDragRef.current = null;
    setActiveDrag(null);
    setCursorStyle(mode === 'view' ? 'default' : isPlacing ? 'crosshair' : 'grab');
    repaint();
    return true;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (finishNodeDrag()) return;

    if (!dragRef.current?.moved) dragRef.current = null;
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    pointDragRef.current = null;
    activeDragRef.current = null;
    suppressClickRef.current = true;
    setActiveDrag(null);
    setCursorStyle(isPlacing ? 'crosshair' : mode === 'view' ? 'default' : 'crosshair');
    repaint();
  };

  return {
    ...selectionHandlers,
    canvasSize,
    changeZoom,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
