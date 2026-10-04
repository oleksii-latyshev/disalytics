import type { Lineup, TacticDrawingStroke, TacticThrow, WorldPoint } from '@disa/demo-core';
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
import {
  findNearestTacticLineup,
  findNearestTacticSpawn,
  tacticRadarToWorld,
} from '../helpers/tactic-plot';
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
  /** The spots on show, which a click can pick; undefined when they are not. */
  readonly spawns: readonly WorldPoint[] | undefined;
  readonly props: Omit<TacticPlateProps, 'map'>;
  /** Told the zoom after a wheel notch, so a readout beside the plate can follow it. */
  readonly onZoomChange?: ((zoom: number) => void) | undefined;
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
  spawns,
  props,
  onZoomChange,
}: UseTacticPlatePointerOptions) {
  const {
    onSelectSlot,
    onSelectThrow,
    onPlayerDrag,
    onPlayerDragEnd,
    onPickSpawn,
    selectedSlot = null,
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
  const hasDraggedPlayerRef = useRef(false);
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

  /** A click on a spawn spot places the selected player there; true when it did. */
  const pickSpawnAt = (info: { readonly pt: RadarPoint; readonly scale: number }): boolean => {
    if (spawns === undefined || selectedSlot === null || !isEditable) return false;
    const spot = findNearestTacticSpawn(info.pt, spawns, overview, info.scale);
    if (spot === null) return false;
    onPickSpawn?.(spot);
    return true;
  };

  /** A press on empty plate pans it (middle button or zoomed in); otherwise it is a plain click. */
  const handleBackgroundDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    worldPos: { readonly x: number; readonly y: number },
  ) => {
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
    if (hit === null && pickSpawnAt(info)) return;

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

    handleBackgroundDown(event, worldPos);
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
      if (dragState.type === 'player') hasDraggedPlayerRef.current = true;
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
    if (dragState.type === 'player' && hasDraggedPlayerRef.current) {
      onPlayerDragEnd?.(dragState.slot);
    }
    hasDraggedPlayerRef.current = false;
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
    onZoomChange?.(viewRef.current.zoom);
    repaint();
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handleWheel };
}
