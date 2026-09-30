import { RADAR_IMAGE_SIZE, radarToWorld } from '@disa/map-data';
import { useEffect } from 'react';
import type { CanvasLayers } from '@/core/renderer';
import { type PlateView, radarPointAt } from '@/features/radar/helpers/view';
import type {
  CanvasNodeDrag,
  CanvasPanDrag,
  ContextMenuData,
  LineupCanvasProps,
} from '../components/lineup-plate-types';
import {
  findHandleUnderPoint,
  HANDLE_RADIUS_PX,
  HIT_RADIUS_PX,
} from '../helpers/lineup-plate-hit-testing';
import { findNearestLineupTarget, findNearestNode } from '../helpers/lineup-plot';

interface SelectionRuntime {
  readonly viewRef: React.MutableRefObject<PlateView>;
  readonly canvasRef: CanvasLayers['canvasRef'];
  readonly plot: Float32Array;
  readonly contextMenu: ContextMenuData | null;
  readonly setContextMenu: (menu: ContextMenuData | null) => void;
  readonly canvasSize: () => { width: number; height: number } | null;
  readonly dragRef: React.MutableRefObject<CanvasPanDrag | null>;
  readonly pointDragRef: React.MutableRefObject<CanvasNodeDrag | null>;
  readonly suppressClickRef: React.MutableRefObject<boolean>;
}

export function useLineupCanvasSelectionInteractions(
  plateProps: LineupCanvasProps,
  runtime: SelectionRuntime,
) {
  const {
    overview,
    lineups,
    focused,
    mode = 'view',
    onSelect,
    onSelectNode,
    onPlacePoint,
    isPlacing = false,
    onCancelPlacement,
    draftOrigin,
  } = plateProps;
  const {
    viewRef,
    canvasRef,
    plot,
    contextMenu,
    setContextMenu,
    dragRef,
    pointDragRef,
    suppressClickRef,
  } = runtime;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (contextMenu !== null) {
          setContextMenu(null);
        } else if (isPlacing) {
          onCancelPlacement?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, isPlacing, onCancelPlacement, setContextMenu]);

  useEffect(() => {
    if (mode === 'view') setContextMenu(null);
  }, [mode, setContextMenu]);

  const eventCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    return {
      box,
      point: radarPointAt(
        viewRef.current,
        event.clientX - box.left,
        event.clientY - box.top,
        box,
        RADAR_IMAGE_SIZE,
      ),
    };
  };

  const clearMovedDrag = () => {
    if (!dragRef.current?.moved && !pointDragRef.current?.moved) return false;
    dragRef.current = null;
    pointDragRef.current = null;
    return true;
  };

  const placeAtPoint = (
    event: React.MouseEvent<HTMLCanvasElement>,
    point: { readonly x: number; readonly y: number },
  ) => {
    const isInsideRadar =
      point.x >= 0 && point.y >= 0 && point.x <= RADAR_IMAGE_SIZE && point.y <= RADAR_IMAGE_SIZE;
    if (!isInsideRadar) return;
    const worldPoint = radarToWorld(overview, point);
    const isBounce = plateProps.isAddingBounce || event.ctrlKey || event.metaKey;
    onPlacePoint?.(worldPoint, isBounce);
  };

  const selectAtPoint = (
    event: React.MouseEvent<HTMLCanvasElement>,
    box: DOMRect,
    point: { readonly x: number; readonly y: number },
  ) => {
    const extent = Math.min(box.width, box.height);
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;
    if (scale <= 0) return;
    const isModifier = event.shiftKey || event.ctrlKey || event.metaKey;

    if (mode === 'edit' && onSelectNode) {
      onSelectNode(
        findNearestNode(point, plot, lineups, overview, scale, HIT_RADIUS_PX),
        isModifier,
      );
      return;
    }
    onSelect(
      findNearestLineupTarget(point, plot, lineups.length, scale, HIT_RADIUS_PX),
      isModifier,
    );
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (contextMenu !== null) setContextMenu(null);
    if (clearMovedDrag()) return;

    const coordinates = eventCoordinates(event);
    if (coordinates === null) return;
    if (isPlacing) {
      placeAtPoint(event, coordinates.point);
      return;
    }
    selectAtPoint(event, coordinates.box, coordinates.point);
  };

  const handleAuxClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 1 || !isPlacing || draftOrigin === undefined || draftOrigin === null) {
      return;
    }
    const coordinates = eventCoordinates(event);
    if (coordinates === null) return;
    const { point } = coordinates;
    const isInsideRadar =
      point.x >= 0 && point.y >= 0 && point.x <= RADAR_IMAGE_SIZE && point.y <= RADAR_IMAGE_SIZE;
    if (!isInsideRadar) return;
    onPlacePoint?.(radarToWorld(overview, point), true);
  };

  const showContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = eventCoordinates(event);
    if (coordinates === null) return;

    const { box, point } = coordinates;
    const extent = Math.min(box.width, box.height);
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;
    const hit = findNearestLineupTarget(point, plot, lineups.length, scale, HIT_RADIUS_PX);
    const hitLineup = hit !== null ? (lineups[hit.index] ?? null) : null;
    const selectedLineup = focused !== null ? (lineups[focused] ?? null) : null;
    const handle =
      selectedLineup === null
        ? null
        : findHandleUnderPoint(point, selectedLineup, overview, scale, HANDLE_RADIUS_PX);

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      hitLineup: hitLineup ?? selectedLineup,
      hitWaypointIndex: handle?.target === 'waypoint' ? (handle.waypointIndex ?? null) : null,
    });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (mode === 'edit' && !isPlacing) {
      showContextMenu(event);
    } else if (mode !== 'edit') {
      setContextMenu(null);
    } else {
      onCancelPlacement?.();
    }
  };

  return { handleClick, handleAuxClick, handleContextMenu };
}
