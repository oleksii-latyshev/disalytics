import type { Lineup, TacticDrawingStroke, TacticThrow } from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, type RadarPoint } from '@disa/map-data';
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type RefObject,
  useCallback,
  useRef,
} from 'react';
import { type PlateView, radarPointAt, SQUARE_PLATE, zoomAbout } from '@/features/radar';
import type { TacticPlateProps } from '../components/tactic-plate-props';
import type { InterpolatedTacticState } from '../helpers/tactic-interpolation';
import {
  checkPointerHit,
  type DragState,
  performDragMove,
  resolveHitDragState,
} from '../helpers/tactic-plate-drag';
import { findNearestTacticLineup, tacticRadarToWorld } from '../helpers/tactic-plot';
import { createTacticToolGestures } from './tactic-tool-gestures';

interface HoverState {
  readonly hoveredSlot: number | null;
  readonly hoveredThrowId: string | null;
  readonly hoveredLineupId: string | null;
  readonly setHoveredSlot: (slot: number | null) => void;
  readonly setHoveredThrowId: (throwId: string | null) => void;
  readonly setHoveredLineupId: (lineupId: string | null) => void;
}

interface UseTacticPlatePointerOptions {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly repaint: () => void;
  readonly overview: MapOverview;
  readonly interpolated: InterpolatedTacticState;
  readonly viewRef: RefObject<PlateView>;
  readonly liveStrokeRef: RefObject<TacticDrawingStroke | null>;
  readonly liveThrowRef: RefObject<TacticThrow | null>;
  readonly hover: HoverState;
  readonly lineups: readonly Lineup[] | undefined;
  readonly props: Omit<TacticPlateProps, 'map'>;
}

export function useTacticPlatePointer({
  canvasRef,
  repaint,
  overview,
  interpolated,
  viewRef,
  liveStrokeRef,
  liveThrowRef,
  hover,
  lineups,
  props,
}: UseTacticPlatePointerOptions) {
  const {
    onSelectSlot,
    onSelectThrow,
    onPlayerDrag,
    onThrowDrag,
    onPlateClick,
    isEditable = false,
    activeTool = 'select',
    newThrowKind = 'smoke',
  } = props;
  const {
    hoveredSlot,
    hoveredThrowId,
    hoveredLineupId,
    setHoveredSlot,
    setHoveredThrowId,
    setHoveredLineupId,
  } = hover;
  const dragStateRef = useRef<DragState>(null);
  const pendingThrowStartRef = useRef<{ x: number; y: number } | null>(null);

  const getRadarPointAndScale = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (canvas === null) return null;
      const box = canvas.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return null;

      const pt = radarPointAt(
        viewRef.current,
        clientX - box.left,
        clientY - box.top,
        box,
        SQUARE_PLATE,
      );
      const extent = Math.min(box.width, box.height) * viewRef.current.zoom;
      const scale = extent / RADAR_IMAGE_SIZE;
      return { pt, scale, box };
    },
    [canvasRef, viewRef],
  );

  const {
    handleEraserDown,
    handlePencilDown,
    handleThrowDown,
    finalizePencilDrag,
    finalizeThrowCreateDrag,
  } = createTacticToolGestures({
    overview,
    interpolated,
    repaint,
    readPointer: getRadarPointAndScale,
    dragStateRef,
    pendingThrowStartRef,
    liveStrokeRef,
    liveThrowRef,
    lineups,
    props,
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const info = getRadarPointAndScale(event.clientX, event.clientY);
    if (info === null) return;
    const worldPos = tacticRadarToWorld(overview, info.pt);

    if (activeTool === 'eraser') {
      handleEraserDown(info, worldPos);
      return;
    }

    if (activeTool === 'pencil') {
      handlePencilDown(event, worldPos);
      return;
    }

    if (activeTool === 'throw') {
      handleThrowDown(event, info, worldPos);
      return;
    }

    const hit = checkPointerHit(info.pt, info.scale, interpolated, overview);
    const drag = resolveHitDragState(
      hit,
      isEditable,
      onSelectSlot,
      onSelectThrow,
      onPlayerDrag,
      onThrowDrag,
    );

    if (drag !== null) {
      dragStateRef.current = drag;
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (hit !== null) return;

    if (event.button === 1 || viewRef.current.zoom > 1) {
      dragStateRef.current = {
        type: 'pan',
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    onPlateClick?.(worldPos);
  };

  const updateHoverTargets = (info: { readonly pt: RadarPoint; readonly scale: number } | null) => {
    if (info === null) {
      setHoveredSlot(null);
      setHoveredThrowId(null);
      setHoveredLineupId(null);
      return;
    }

    const hit = checkPointerHit(info.pt, info.scale, interpolated, overview);
    setHoveredSlot(hit?.type === 'player' ? hit.slot : null);
    setHoveredThrowId(hit?.type === 'throw' ? hit.throwId : null);
    setHoveredLineupId(
      lineups === undefined
        ? null
        : (findNearestTacticLineup(info.pt, lineups, overview, info.scale)?.id ?? null),
    );
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const info = getRadarPointAndScale(event.clientX, event.clientY);
    const dragState = dragStateRef.current;

    if (dragState !== null && info !== null) {
      performDragMove({
        dragState,
        pt: info.pt,
        clientX: event.clientX,
        clientY: event.clientY,
        box: info.box,
        overview,
        view: viewRef.current,
        newThrowKind,
        liveThrowRef,
        onPlayerDrag,
        onThrowDrag,
        repaint,
      });
      return;
    }

    updateHoverTargets(info);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;
    if (dragState === null) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragState.type === 'pencil') {
      finalizePencilDrag();
      return;
    }

    if (dragState.type === 'throw_create') {
      finalizeThrowCreateDrag(dragState.from, event.clientX, event.clientY);
      return;
    }

    dragStateRef.current = null;
  };

  const handlePointerLeave = () => {
    if (hoveredSlot !== null) setHoveredSlot(null);
    if (hoveredThrowId !== null) setHoveredThrowId(null);
    if (hoveredLineupId !== null) setHoveredLineupId(null);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAbout(
      viewRef.current,
      factor,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      SQUARE_PLATE,
    );
    repaint();
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handleWheel };
}
