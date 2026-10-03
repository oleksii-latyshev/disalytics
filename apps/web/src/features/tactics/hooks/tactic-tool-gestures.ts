import type { TacticDrawingStroke, TacticThrow } from '@disa/demo-core';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { TacticPlateProps } from '../components/tactic-plate-props';
import type { InterpolatedTacticState } from '../helpers/tactic-interpolation';
import {
  checkPointerHit,
  type DragState,
  findNearestDrawingStroke,
} from '../helpers/tactic-plate-drag';
import { tacticRadarToWorld } from '../helpers/tactic-plot';

type WorldPoint = { x: number; y: number };

export interface RadarPointerInfo {
  readonly pt: RadarPoint;
  readonly scale: number;
}

interface TacticToolGestureOptions {
  readonly overview: MapOverview;
  readonly interpolated: InterpolatedTacticState;
  readonly repaint: () => void;
  readonly readPointer: (clientX: number, clientY: number) => RadarPointerInfo | null;
  readonly dragStateRef: RefObject<DragState>;
  readonly pendingThrowStartRef: RefObject<WorldPoint | null>;
  readonly liveStrokeRef: RefObject<TacticDrawingStroke | null>;
  readonly liveThrowRef: RefObject<TacticThrow | null>;
  readonly props: Omit<TacticPlateProps, 'map'>;
}

export function createTacticToolGestures({
  overview,
  interpolated,
  repaint,
  readPointer,
  dragStateRef,
  pendingThrowStartRef,
  liveStrokeRef,
  liveThrowRef,
  props,
}: TacticToolGestureOptions) {
  const {
    selectedSlot = null,
    pencilColor = 'var(--color-ct)',
    newThrowKind = 'smoke',
    onAddDrawingStroke,
    onAddThrow,
    onDeleteThrow,
    onDeleteDrawingStroke,
  } = props;

  const handleEraserDown = (
    info: RadarPointerInfo,
    worldPos: { x: number; y: number },
  ): boolean => {
    const hit = checkPointerHit(info.pt, info.scale, interpolated, overview);
    if (hit?.type === 'throw') {
      onDeleteThrow?.(hit.throwId);
      return true;
    }
    const strokeIdx = findNearestDrawingStroke(worldPos, interpolated.drawings);
    if (strokeIdx !== null) {
      onDeleteDrawingStroke?.(strokeIdx);
      return true;
    }
    return false;
  };

  const handlePencilDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    worldPos: { x: number; y: number },
  ) => {
    const initialPoints = [{ x: Math.round(worldPos.x), y: Math.round(worldPos.y) }];
    liveStrokeRef.current = {
      id: 'temp-stroke',
      color: pencilColor,
      points: initialPoints,
    };
    dragStateRef.current = {
      type: 'pencil',
      points: initialPoints,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    repaint();
  };

  const handleThrowDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    worldPos: { x: number; y: number },
  ) => {
    const roundedPos = { x: Math.round(worldPos.x), y: Math.round(worldPos.y) };
    if (pendingThrowStartRef.current !== null) {
      onAddThrow?.({
        kind: newThrowKind,
        from: pendingThrowStartRef.current,
        to: roundedPos,
      });
      pendingThrowStartRef.current = null;
      liveThrowRef.current = null;
      repaint();
      return;
    }

    dragStateRef.current = {
      type: 'throw_create',
      from: roundedPos,
    };
    liveThrowRef.current = {
      id: 'temp-throw',
      kind: newThrowKind,
      from: roundedPos,
      to: roundedPos,
      throwerSlot: selectedSlot ?? 0,
      releaseTime: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    repaint();
  };

  const finalizePencilDrag = () => {
    if (liveStrokeRef.current !== null && liveStrokeRef.current.points.length > 0) {
      onAddDrawingStroke?.(liveStrokeRef.current);
    }
    liveStrokeRef.current = null;
    dragStateRef.current = null;
    repaint();
  };

  const finalizeThrowCreateDrag = (
    from: { x: number; y: number },
    clientX: number,
    clientY: number,
  ) => {
    const info = readPointer(clientX, clientY);
    const toPos = info !== null ? tacticRadarToWorld(overview, info.pt) : from;
    const roundedTo = { x: Math.round(toPos.x), y: Math.round(toPos.y) };
    const dist = Math.hypot(roundedTo.x - from.x, roundedTo.y - from.y);

    if (dist > 30) {
      onAddThrow?.({
        kind: newThrowKind,
        from,
        to: roundedTo,
      });
      pendingThrowStartRef.current = null;
    } else {
      pendingThrowStartRef.current = from;
    }

    liveThrowRef.current = null;
    dragStateRef.current = null;
    repaint();
  };

  return {
    handleEraserDown,
    handlePencilDown,
    handleThrowDown,
    finalizePencilDrag,
    finalizeThrowCreateDrag,
  };
}
