import type {
  TacticDrawingStroke,
  TacticSide,
  TacticStep,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import {
  getMapOverview,
  type MapOverview,
  RADAR_IMAGE_SIZE,
  type RadarPoint,
  radarAssetPath,
} from '@disa/map-data';
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { levelAt } from '../helpers/levels';
import {
  type InterpolatedTacticState,
  interpolateTacticStep,
} from '../helpers/tactic-interpolation';
import { tacticLayer } from '../helpers/tactic-layer';
import {
  findNearestTacticPlayer,
  findNearestTacticThrow,
  tacticRadarToWorld,
} from '../helpers/tactic-plot';
import { type PlateView, panBy, plateView, radarPointAt, zoomAbout } from '../helpers/view';
import { useRadarImage } from '../hooks/use-radar-image';
import { UnknownMap } from './UnknownMap';

export interface TacticPlateProps {
  readonly map: string;
  readonly side?: TacticSide | undefined;
  readonly steps: readonly TacticStep[];
  readonly activeStepIndex?: number | undefined;
  readonly currentTime?: number | undefined;
  readonly selectedSlot?: number | null | undefined;
  readonly selectedThrowId?: string | null | undefined;
  readonly onSelectSlot?: ((slot: number | null) => void) | undefined;
  readonly onSelectThrow?: ((throwId: string | null) => void) | undefined;
  readonly onPlayerDrag?:
    | ((slot: number, worldPoint: { x: number; y: number }) => void)
    | undefined;
  readonly onThrowDrag?:
    | ((throwId: string, end: 'from' | 'to', worldPoint: { x: number; y: number }) => void)
    | undefined;
  readonly onPlateClick?: ((worldPoint: { x: number; y: number }) => void) | undefined;
  readonly isEditable?: boolean | undefined;
  readonly levelIndex?: number | undefined;
  readonly className?: string | undefined;

  readonly activeTool?: 'select' | 'pencil' | 'throw' | 'eraser' | undefined;
  readonly pencilColor?: string | undefined;
  readonly newThrowKind?: UtilityKind | undefined;
  readonly onAddDrawingStroke?: ((stroke: TacticDrawingStroke) => void) | undefined;
  readonly onAddThrow?:
    | ((throwData: Partial<TacticThrow> & Pick<TacticThrow, 'kind' | 'from' | 'to'>) => void)
    | undefined;
  readonly onDeleteThrow?: ((throwId: string) => void) | undefined;
  readonly onDeleteDrawingStroke?: ((index: number) => void) | undefined;
}

type DragState =
  | { readonly type: 'player'; readonly slot: number }
  | { readonly type: 'throw'; readonly throwId: string; readonly end: 'from' | 'to' }
  | { readonly type: 'pan'; startX: number; startY: number }
  | { readonly type: 'pencil'; readonly points: { x: number; y: number }[] }
  | { readonly type: 'throw_create'; readonly from: { x: number; y: number } }
  | null;

type HitTarget =
  | { readonly type: 'player'; readonly slot: number }
  | { readonly type: 'throw'; readonly throwId: string; readonly end: 'from' | 'to' }
  | null;

function checkPointerHit(
  pt: RadarPoint,
  scale: number,
  interpolated: InterpolatedTacticState,
  overview: MapOverview,
): HitTarget {
  const hitPlayer = findNearestTacticPlayer(pt, interpolated.players, overview, scale, 20);
  if (hitPlayer !== null) {
    return { type: 'player', slot: hitPlayer.slot };
  }

  const hitThrow = findNearestTacticThrow(pt, interpolated.visibleThrows, overview, scale, 18);
  if (hitThrow !== null) {
    return { type: 'throw', throwId: hitThrow.throwId, end: hitThrow.end };
  }

  return null;
}

function resolveHitDragState(
  hit: HitTarget,
  isEditable: boolean,
  onSelectSlot?: ((slot: number | null) => void) | undefined,
  onSelectThrow?: ((throwId: string | null) => void) | undefined,
  onPlayerDrag?: ((slot: number, worldPoint: { x: number; y: number }) => void) | undefined,
  onThrowDrag?:
    | ((throwId: string, end: 'from' | 'to', worldPoint: { x: number; y: number }) => void)
    | undefined,
): DragState {
  if (hit?.type === 'player') {
    onSelectSlot?.(hit.slot);
    onSelectThrow?.(null);
    return isEditable && onPlayerDrag !== undefined ? { type: 'player', slot: hit.slot } : null;
  }
  if (hit?.type === 'throw') {
    onSelectThrow?.(hit.throwId);
    onSelectSlot?.(null);
    return isEditable && onThrowDrag !== undefined
      ? { type: 'throw', throwId: hit.throwId, end: hit.end }
      : null;
  }
  onSelectSlot?.(null);
  onSelectThrow?.(null);
  return null;
}

function findNearestDrawingStroke(
  worldPos: { x: number; y: number },
  drawings: readonly TacticDrawingStroke[],
  threshold = 200,
): number | null {
  let bestIdx: number | null = null;
  let bestDist = threshold;

  for (let i = 0; i < drawings.length; i++) {
    const stroke = drawings[i];
    if (stroke === undefined) continue;
    for (let j = 0; j < stroke.points.length; j++) {
      const p = stroke.points[j];
      if (p === undefined) continue;
      const d = Math.hypot(p.x - worldPos.x, p.y - worldPos.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}

interface PerformDragOptions {
  readonly dragState: NonNullable<DragState>;
  readonly pt: RadarPoint;
  readonly clientX: number;
  readonly clientY: number;
  readonly box: DOMRect;
  readonly overview: MapOverview;
  readonly view: PlateView;
  readonly newThrowKind?: UtilityKind | undefined;
  readonly liveThrowRef?: { current: TacticThrow | null } | undefined;
  readonly onPlayerDrag?:
    | ((slot: number, worldPoint: { x: number; y: number }) => void)
    | undefined;
  readonly onThrowDrag?:
    | ((throwId: string, end: 'from' | 'to', worldPoint: { x: number; y: number }) => void)
    | undefined;
  readonly repaint?: (() => void) | undefined;
}

function performDragMove(options: PerformDragOptions): void {
  const {
    dragState,
    pt,
    clientX,
    clientY,
    box,
    overview,
    view,
    newThrowKind,
    liveThrowRef,
    onPlayerDrag,
    onThrowDrag,
    repaint,
  } = options;

  if (dragState.type === 'player') {
    const worldPos = tacticRadarToWorld(overview, pt);
    onPlayerDrag?.(dragState.slot, worldPos);
    return;
  }

  if (dragState.type === 'throw') {
    const worldPos = tacticRadarToWorld(overview, pt);
    onThrowDrag?.(dragState.throwId, dragState.end, worldPos);
    return;
  }

  if (dragState.type === 'pencil') {
    const worldPos = tacticRadarToWorld(overview, pt);
    const last = dragState.points[dragState.points.length - 1];
    if (last === undefined || Math.hypot(worldPos.x - last.x, worldPos.y - last.y) > 10) {
      dragState.points.push({ x: Math.round(worldPos.x), y: Math.round(worldPos.y) });
      repaint?.();
    }
    return;
  }

  if (dragState.type === 'throw_create') {
    const worldPos = tacticRadarToWorld(overview, pt);
    if (liveThrowRef !== undefined) {
      liveThrowRef.current = {
        id: 'temp-throw',
        kind: newThrowKind ?? 'smoke',
        from: dragState.from,
        to: { x: Math.round(worldPos.x), y: Math.round(worldPos.y) },
        throwerSlot: 0,
        releaseTime: 0,
      };
      repaint?.();
    }
    return;
  }

  if (dragState.type === 'pan') {
    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;
    panBy(view, dx, dy, box);
    dragState.startX = clientX;
    dragState.startY = clientY;
    repaint?.();
  }
}

function TacticCanvas({
  overview,
  side,
  steps,
  activeStepIndex = 0,
  currentTime,
  selectedSlot = null,
  selectedThrowId = null,
  onSelectSlot,
  onSelectThrow,
  onPlayerDrag,
  onThrowDrag,
  onPlateClick,
  isEditable = false,
  levelIndex = 0,
  className,
  activeTool = 'select',
  pencilColor = 'var(--color-ct)',
  newThrowKind = 'smoke',
  onAddDrawingStroke,
  onAddThrow,
  onDeleteThrow,
  onDeleteDrawingStroke,
}: Omit<TacticPlateProps, 'map'> & { readonly overview: MapOverview }) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, levelIndex), theme));
  const colors = radarColors(palette);

  const viewRef = useRef(plateView());
  const dragStateRef = useRef<DragState>(null);
  const liveStrokeRef = useRef<TacticDrawingStroke | null>(null);
  const liveThrowRef = useRef<TacticThrow | null>(null);
  const pendingThrowStartRef = useRef<{ x: number; y: number } | null>(null);

  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [hoveredThrowId, setHoveredThrowId] = useState<string | null>(null);

  const interpolated: InterpolatedTacticState = useMemo(() => {
    if (currentTime !== undefined) {
      return interpolateTacticStep(steps, currentTime);
    }

    const currentStep = steps[activeStepIndex] ?? steps[0];
    if (currentStep === undefined) {
      return {
        players: [],
        activeStepIndex: 0,
        flyingGrenades: [],
        activeUtilities: [],
        drawings: [],
        visibleThrows: [],
      };
    }

    return {
      players: currentStep.players,
      activeStepIndex,
      flyingGrenades: [],
      activeUtilities: [],
      drawings: currentStep.drawings ?? [],
      visibleThrows: currentStep.throws,
    };
  }, [steps, activeStepIndex, currentTime]);

  const layers = useMemo(() => {
    const layer = tacticLayer({
      overview,
      colors,
      view: viewRef,
      side,
      players: interpolated.players,
      throws: interpolated.visibleThrows,
      flyingGrenades: interpolated.flyingGrenades,
      activeUtilities: interpolated.activeUtilities,
      drawings: interpolated.drawings,
      selectedSlot,
      selectedThrowId,
      hoveredSlot,
      hoveredThrowId,
      liveStroke: liveStrokeRef,
      liveThrow: liveThrowRef,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), layer] : [layer];
  }, [
    overview,
    colors,
    side,
    interpolated,
    selectedSlot,
    selectedThrowId,
    hoveredSlot,
    hoveredThrowId,
    image,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);

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
        RADAR_IMAGE_SIZE,
      );
      const extent = Math.min(box.width, box.height) * viewRef.current.zoom;
      const scale = extent / RADAR_IMAGE_SIZE;
      return { pt, scale, box };
    },
    [canvasRef],
  );

  const handleEraserDown = (
    info: { pt: RadarPoint; scale: number },
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
      color: pencilColor ?? 'var(--color-ct)',
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
        kind: newThrowKind ?? 'smoke',
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
      kind: newThrowKind ?? 'smoke',
      from: roundedPos,
      to: roundedPos,
      throwerSlot: selectedSlot ?? 0,
      releaseTime: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    repaint();
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
      handleThrowDown(event, worldPos);
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
      return;
    }

    const hit = checkPointerHit(info.pt, info.scale, interpolated, overview);
    setHoveredSlot(hit?.type === 'player' ? hit.slot : null);
    setHoveredThrowId(hit?.type === 'throw' ? hit.throwId : null);
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
    const info = getRadarPointAndScale(clientX, clientY);
    const toPos = info !== null ? tacticRadarToWorld(overview, info.pt) : from;
    const roundedTo = { x: Math.round(toPos.x), y: Math.round(toPos.y) };
    const dist = Math.hypot(roundedTo.x - from.x, roundedTo.y - from.y);

    if (dist > 30) {
      onAddThrow?.({
        kind: newThrowKind ?? 'smoke',
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
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAbout(viewRef.current, factor, event.clientX - box.left, event.clientY - box.top, box);
    repaint();
  };

  const cursorClass =
    activeTool === 'pencil' || activeTool === 'throw'
      ? 'cursor-crosshair'
      : activeTool === 'eraser'
        ? 'cursor-pointer'
        : 'cursor-default';

  return (
    <div className="grid min-h-0 min-w-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('radar.label', { map: overview.id })}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        className={
          className ??
          `aspect-square w-[min(100cqi,100cqb)] ${cursorClass} select-none rounded-card bg-surface-0`
        }
      />
    </div>
  );
}

export function TacticPlate(props: TacticPlateProps) {
  const overview = getMapOverview(props.map);

  if (overview === undefined) {
    return <UnknownMap map={props.map} />;
  }

  return <TacticCanvas {...props} overview={overview} />;
}
