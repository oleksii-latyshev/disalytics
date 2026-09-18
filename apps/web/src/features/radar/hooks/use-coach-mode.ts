import {
  asPlayerSlot,
  FLAG_ALIVE,
  type ParsedDemo,
  type PlayerSlot,
  sampleAt,
  type Team,
} from '@disa/demo-core';
import {
  type MapOverview,
  RADAR_IMAGE_SIZE,
  type RadarPoint,
  radarX,
  radarY,
} from '@disa/map-data';
import { type PointerEvent, type RefObject, useCallback, useMemo, useRef, useState } from 'react';
import { POSITION_STRIDE, positionScratch, readPositions } from '@/core/playback';
import {
  findHitPlayerToken,
  findHitStroke,
  findHitUtility,
  pointDistance,
} from '../helpers/coach-draw';
import {
  type CoachAnnotations,
  type CoachHistory,
  type CoachPencilColor,
  type CoachStroke,
  type CoachTool,
  type CoachUtility,
  type CoachUtilityKind,
  createCoachHistory,
  EMPTY_COACH_ANNOTATIONS,
  pushCoachSnapshot,
  redoCoachHistory,
  undoCoachHistory,
} from '../helpers/coach-types';
import type { RadarColors } from '../helpers/colors';
import { type PlateView, radarPointAt } from '../helpers/view';

interface Options {
  readonly demo: ParsedDemo;
  readonly overview: MapOverview;
  readonly view: RefObject<PlateView>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly colors: RadarColors;
  readonly frame: number;
}

export function resolvePencilColor(color: CoachPencilColor, colors: RadarColors): string {
  switch (color) {
    case 'objective':
      return colors.objective;
    case 'ct':
      return colors.team.CT;
    case 't':
      return colors.team.T;
    case 'damage':
      return colors.damage;
    case 'ink':
      return colors.selectionRing;
  }
}

let nextId = 1;
function generateId(): string {
  return `coach-${Date.now()}-${nextId++}`;
}

function eraseAtPoint(
  annotations: CoachAnnotations,
  originalPlayerPoints: ReadonlyMap<PlayerSlot, RadarPoint>,
  pt: RadarPoint,
): CoachAnnotations | null {
  const hitUtility = findHitUtility(annotations.utilities, pt);
  if (hitUtility !== null) {
    return {
      ...annotations,
      utilities: annotations.utilities.filter((u) => u.id !== hitUtility.id),
    };
  }

  const hitStroke = findHitStroke(annotations.strokes, pt);
  if (hitStroke !== null) {
    return {
      ...annotations,
      strokes: annotations.strokes.filter((s) => s.id !== hitStroke.id),
    };
  }

  const hitPlayer = findHitPlayerToken(originalPlayerPoints, annotations.movedPlayers, pt);
  if (hitPlayer?.isMoved) {
    return {
      ...annotations,
      movedPlayers: annotations.movedPlayers.filter((m) => m.slot !== hitPlayer.slot),
    };
  }

  return null;
}

function eraseStrokesAndUtilities(
  annotations: CoachAnnotations,
  pt: RadarPoint,
): CoachAnnotations | null {
  const hitStroke = findHitStroke(annotations.strokes, pt);
  const hitUtil = findHitUtility(annotations.utilities, pt);

  if (hitStroke === null && hitUtil === null) return null;

  return {
    ...annotations,
    strokes:
      hitStroke !== null
        ? annotations.strokes.filter((s) => s.id !== hitStroke.id)
        : annotations.strokes,
    utilities:
      hitUtil !== null
        ? annotations.utilities.filter((u) => u.id !== hitUtil.id)
        : annotations.utilities,
  };
}

function isUtilityTool(tool: CoachTool): tool is CoachUtilityKind {
  return tool === 'smoke' || tool === 'molotov' || tool === 'flash' || tool === 'he';
}

function tryEraseOnDown(
  tool: CoachTool,
  annotations: CoachAnnotations,
  originalPlayerPoints: ReadonlyMap<PlayerSlot, RadarPoint>,
  pt: RadarPoint,
  commitSnapshot: (annotations: CoachAnnotations) => void,
): boolean {
  if (tool !== 'eraser') return false;
  const next = eraseAtPoint(annotations, originalPlayerPoints, pt);
  if (next !== null) commitSnapshot(next);
  return true;
}

function findDraggableTarget(
  tool: CoachTool,
  annotations: CoachAnnotations,
  originalPlayerPoints: ReadonlyMap<PlayerSlot, RadarPoint>,
  pt: RadarPoint,
): { utilityId: string | null; playerSlot: PlayerSlot | null } {
  if (tool !== 'move' && tool !== 'pencil') {
    return { utilityId: null, playerSlot: null };
  }
  const hitUtility = findHitUtility(annotations.utilities, pt);
  if (hitUtility !== null) return { utilityId: hitUtility.id, playerSlot: null };
  const hitPlayer = findHitPlayerToken(originalPlayerPoints, annotations.movedPlayers, pt);
  if (hitPlayer !== null) return { utilityId: null, playerSlot: hitPlayer.slot };
  return { utilityId: null, playerSlot: null };
}

function handleStampOrStroke(
  tool: CoachTool,
  pt: RadarPoint,
  activeColor: string,
  annotations: CoachAnnotations,
  commitSnapshot: (annotations: CoachAnnotations) => void,
): { utilityId: string | null; activeStroke: CoachStroke | null } {
  if (isUtilityTool(tool)) {
    const newUtility: CoachUtility = { id: generateId(), kind: tool, point: pt };
    commitSnapshot({ ...annotations, utilities: [...annotations.utilities, newUtility] });
    return { utilityId: newUtility.id, activeStroke: null };
  }
  if (tool === 'pencil') {
    return {
      utilityId: null,
      activeStroke: { id: generateId(), color: activeColor, points: [pt] },
    };
  }
  return { utilityId: null, activeStroke: null };
}

function updateActiveStroke(
  activeStroke: CoachStroke,
  pt: RadarPoint,
  setHistory: (updater: (prev: CoachHistory) => CoachHistory) => void,
): CoachStroke {
  const lastPt = activeStroke.points[activeStroke.points.length - 1];
  if (lastPt !== undefined && pointDistance(lastPt, pt) >= 1.5) {
    const updated = { ...activeStroke, points: [...activeStroke.points, pt] };
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        strokes: [...prev.present.strokes.filter((s) => s.id !== activeStroke.id), updated],
      },
    }));
    return updated;
  }
  return activeStroke;
}

function updateDragUtility(
  id: string,
  pt: RadarPoint,
  setHistory: (updater: (prev: CoachHistory) => CoachHistory) => void,
): void {
  setHistory((prev) => ({
    ...prev,
    present: {
      ...prev.present,
      utilities: prev.present.utilities.map((u) => (u.id === id ? { ...u, point: pt } : u)),
    },
  }));
}

function updateDragPlayer(
  slot: PlayerSlot,
  pt: RadarPoint,
  setHistory: (updater: (prev: CoachHistory) => CoachHistory) => void,
): void {
  setHistory((prev) => ({
    ...prev,
    present: {
      ...prev.present,
      movedPlayers: [
        ...prev.present.movedPlayers.filter((m) => m.slot !== slot),
        { slot, point: pt },
      ],
    },
  }));
}

function handleDragErase(
  tool: CoachTool,
  didErase: boolean,
  annotations: CoachAnnotations,
  pt: RadarPoint,
  setHistory: (updater: (prev: CoachHistory) => CoachHistory) => void,
): boolean {
  if (tool !== 'eraser' || !didErase) return false;
  const erased = eraseStrokesAndUtilities(annotations, pt);
  if (erased !== null) {
    setHistory((prev) => ({ ...prev, present: erased }));
  }
  return true;
}

function updateHoverTargets(
  annotations: CoachAnnotations,
  originalPlayerPoints: ReadonlyMap<PlayerSlot, RadarPoint>,
  pt: RadarPoint,
  setHoveredUtilityId: (id: string | null) => void,
  setHoveredPlayerSlot: (slot: PlayerSlot | null) => void,
): void {
  const hitU = findHitUtility(annotations.utilities, pt);
  setHoveredUtilityId(hitU?.id ?? null);
  const hitP = findHitPlayerToken(originalPlayerPoints, annotations.movedPlayers, pt);
  setHoveredPlayerSlot(hitP?.slot ?? null);
}

export function useCoachMode({
  demo,
  overview,
  view,
  canvasRef,
  teamBySlot,
  colors,
  frame,
}: Options) {
  const [tool, setTool] = useState<CoachTool>('pencil');
  const [colorName, setColorName] = useState<CoachPencilColor>('objective');
  const [history, setHistory] = useState(() => createCoachHistory());

  // Active stroke being drawn before pointer up
  const activeStrokeRef = useRef<CoachStroke | null>(null);
  // Active utility being placed or dragged
  const draggingUtilityIdRef = useRef<string | null>(null);
  // Active player token being dragged
  const draggingPlayerSlotRef = useRef<PlayerSlot | null>(null);
  // Track whether an erase occurred during the drag
  const didEraseRef = useRef(false);

  // Hover state for visual highlights
  const [hoveredUtilityId, setHoveredUtilityId] = useState<string | null>(null);
  const [hoveredPlayerSlot, setHoveredPlayerSlot] = useState<PlayerSlot | null>(null);

  const annotations = history.present;

  // Calculate original positions of alive players at the paused frame
  const originalPlayerPoints = useMemo(() => {
    const map = new Map<PlayerSlot, RadarPoint>();
    const positions = positionScratch(demo.track);
    const base = readPositions(demo.track, frame, positions) * demo.track.slotCount;

    for (let slot = 0; slot < demo.track.slotCount; slot++) {
      if (teamBySlot[slot] === undefined) continue;
      if ((sampleAt(demo.track.flags, base + slot) & FLAG_ALIVE) === 0) continue;

      const wx = positions[slot * POSITION_STRIDE];
      const wy = positions[slot * POSITION_STRIDE + 1];
      if (wx !== undefined && wy !== undefined) {
        map.set(asPlayerSlot(slot), {
          x: radarX(overview, wx),
          y: radarY(overview, wy),
        });
      }
    }

    return map;
  }, [demo.track, overview, frame, teamBySlot]);

  const activeColor = resolvePencilColor(colorName, colors);

  const commitSnapshot = useCallback((next: CoachAnnotations) => {
    setHistory((prev) => pushCoachSnapshot(prev, next));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => undoCoachHistory(prev) ?? prev);
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => redoCoachHistory(prev) ?? prev);
  }, []);

  const clear = useCallback(() => {
    setHistory((prev) => pushCoachSnapshot(prev, EMPTY_COACH_ANNOTATIONS));
  }, []);

  const resetAll = useCallback(() => {
    setHistory(createCoachHistory(EMPTY_COACH_ANNOTATIONS));
    activeStrokeRef.current = null;
    draggingUtilityIdRef.current = null;
    draggingPlayerSlotRef.current = null;
    didEraseRef.current = false;
    setHoveredUtilityId(null);
    setHoveredPlayerSlot(null);
  }, []);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): RadarPoint | null => {
      const canvas = canvasRef.current;
      if (canvas === null) return null;
      const box = canvas.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return null;

      return radarPointAt(
        view.current,
        clientX - box.left,
        clientY - box.top,
        box,
        RADAR_IMAGE_SIZE,
      );
    },
    [canvasRef, view],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(event.clientX, event.clientY);
      if (pt === null) return;

      event.currentTarget.setPointerCapture(event.pointerId);

      if (tryEraseOnDown(tool, annotations, originalPlayerPoints, pt, commitSnapshot)) {
        didEraseRef.current = true;
        return;
      }

      const drag = findDraggableTarget(tool, annotations, originalPlayerPoints, pt);
      if (drag.utilityId !== null) {
        draggingUtilityIdRef.current = drag.utilityId;
        return;
      }
      if (drag.playerSlot !== null) {
        draggingPlayerSlotRef.current = drag.playerSlot;
        return;
      }

      const stamp = handleStampOrStroke(tool, pt, activeColor, annotations, commitSnapshot);
      if (stamp.utilityId !== null) {
        draggingUtilityIdRef.current = stamp.utilityId;
      } else if (stamp.activeStroke !== null) {
        activeStrokeRef.current = stamp.activeStroke;
      }
    },
    [getCanvasPoint, annotations, tool, originalPlayerPoints, activeColor, commitSnapshot],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(event.clientX, event.clientY);
      if (pt === null) return;

      if (activeStrokeRef.current !== null) {
        activeStrokeRef.current = updateActiveStroke(activeStrokeRef.current, pt, setHistory);
        return;
      }
      if (draggingUtilityIdRef.current !== null) {
        updateDragUtility(draggingUtilityIdRef.current, pt, setHistory);
        return;
      }
      if (draggingPlayerSlotRef.current !== null) {
        updateDragPlayer(draggingPlayerSlotRef.current, pt, setHistory);
        return;
      }
      if (handleDragErase(tool, didEraseRef.current, annotations, pt, setHistory)) {
        return;
      }

      updateHoverTargets(
        annotations,
        originalPlayerPoints,
        pt,
        setHoveredUtilityId,
        setHoveredPlayerSlot,
      );
    },
    [getCanvasPoint, tool, annotations, originalPlayerPoints],
  );

  const handlePointerUp = useCallback(() => {
    if (activeStrokeRef.current !== null) {
      const stroke = activeStrokeRef.current;
      activeStrokeRef.current = null;
      // Commit stroke to snapshot history
      setHistory((prev) => {
        const baseStrokes = prev.present.strokes.filter((s) => s.id !== stroke.id);
        const finalAnnotations: CoachAnnotations = {
          ...prev.present,
          strokes: [...baseStrokes, stroke],
        };
        return pushCoachSnapshot(
          { ...prev, present: { ...prev.present, strokes: baseStrokes } },
          finalAnnotations,
        );
      });
    }

    if (draggingUtilityIdRef.current !== null) {
      draggingUtilityIdRef.current = null;
      // Snapshot the final drag position
      setHistory((prev) => pushCoachSnapshot(prev, prev.present));
    }

    if (draggingPlayerSlotRef.current !== null) {
      draggingPlayerSlotRef.current = null;
      // Snapshot the final player position
      setHistory((prev) => pushCoachSnapshot(prev, prev.present));
    }

    if (didEraseRef.current) {
      didEraseRef.current = false;
      setHistory((prev) => pushCoachSnapshot(prev, prev.present));
    }
  }, []);

  return {
    tool,
    setTool,
    colorName,
    setColorName,
    activeColor,
    annotations,
    originalPlayerPoints,
    hoveredUtilityId,
    hoveredPlayerSlot,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    clear,
    resetAll,
    canvasProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
