import type { Lineup, TacticPoint, TacticStep } from '@disa/demo-core';
import type { MapOverview, NavGrid, RadarPoint } from '@disa/map-data';
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type RefObject,
  useRef,
} from 'react';
import { type PlateView, radarPointAt, SQUARE_PLATE, zoomAbout } from '@/features/radar';
import type { TacticTool } from '../helpers/tactic-editor-state';
import { enemiesOf } from '../helpers/tactic-enemies';
import { enemyAt } from '../helpers/tactic-enemy-hit';
import { handleAt, lineupAt, tokenAt } from '../helpers/tactic-hit';
import type { TacticPreview } from '../helpers/tactic-layer';
import { snapPoint, toRadar, toWorld, walkBetween } from '../helpers/tactic-route';
import type { StepSchedule } from '../helpers/tactic-schedule';

/** A free-hand stroke keeps a point every this many radar pixels. */
const PEN_SPACING_RADAR_PX = 7;
const SPOT_HIT_PX = 14;

export interface PlateActions {
  readonly onSelect: (slot: number | null) => void;
  readonly onSelectEnemy: (id: string | null) => void;
  readonly onPlaceEnemy: (point: TacticPoint) => void;
  readonly onMoveEnemy: (id: string, point: TacticPoint) => void;
  readonly onAddWaypoint: (slot: number, point: TacticPoint) => void;
  readonly onMoveWaypoint: (slot: number, index: number, point: TacticPoint) => void;
  readonly onPenStroke: (slot: number, points: readonly TacticPoint[]) => void;
  readonly onLineup: (lineup: Lineup) => void;
  readonly onHandThrow: (point: TacticPoint) => void;
  readonly onPickSpawn: (spot: number) => void;
  readonly onEndGesture: () => void;
  readonly onInteract: () => void;
}

interface Options {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly repaint: () => void;
  readonly overview: MapOverview;
  readonly grid: NavGrid | undefined;
  readonly viewRef: RefObject<PlateView>;
  readonly previewRef: { current: TacticPreview | null };
  readonly liveStrokeRef: { current: readonly RadarPoint[] | null };
  readonly tool: TacticTool;
  readonly selectedSlot: number | null;
  readonly step: TacticStep | undefined;
  readonly stepSchedule: StepSchedule | undefined;
  readonly lineups: readonly Lineup[] | undefined;
  /** Spawn spots a click can take, or undefined while they are not offered. */
  readonly spawnSpots: readonly TacticPoint[] | undefined;
  readonly actions: PlateActions;
  readonly isShown: boolean;
  readonly onHover: (hover: { handle: number | null; lineupId: string | null }) => void;
  readonly onPreviewReach: (isReachable: boolean | null) => void;
  readonly onZoomChange: (zoom: number) => void;
}

type Drag =
  | { readonly type: 'handle'; readonly slot: number; readonly index: number }
  | { readonly type: 'pen'; readonly slot: number }
  | { readonly type: 'enemy'; readonly id: string }
  | { readonly type: 'pan'; readonly x: number; readonly y: number };

function endOf(stepSchedule: StepSchedule | undefined, slot: number | null): RadarPoint | null {
  const leg = slot === null ? undefined : stepSchedule?.legs[slot];
  if (leg === undefined) return null;
  return { x: leg.xs[leg.xs.length - 1] ?? 0, y: leg.ys[leg.ys.length - 1] ?? 0 };
}

export function useTacticPlatePointer(options: Options) {
  const { canvasRef, repaint, overview, viewRef, previewRef, liveStrokeRef, actions } = options;
  const dragRef = useRef<Drag | null>(null);
  const penRef = useRef<RadarPoint[]>([]);
  const previewKeyRef = useRef('');
  const hoverRef = useRef<{ handle: number | null; lineupId: string | null }>({
    handle: null,
    lineupId: null,
  });

  const read = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    const point = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      SQUARE_PLATE,
    );
    const scale = (Math.min(box.width, box.height) * viewRef.current.zoom) / 1024;
    return { point, scale, box };
  };

  const clearPreview = () => {
    if (previewRef.current === null) return;
    previewRef.current = null;
    previewKeyRef.current = '';
    options.onPreviewReach(null);
    repaint();
  };

  const updatePreview = (point: RadarPoint) => {
    const from = endOf(options.stepSchedule, options.selectedSlot);
    const isRoute = options.tool === 'route' && !options.isShown;
    if (
      !isRoute ||
      from === null ||
      options.stepSchedule?.legs[options.selectedSlot ?? -1]?.isDead
    ) {
      clearPreview();
      return;
    }
    const target = snapPoint(options.grid, point);
    const key = `${Math.round(target.x / 4)},${Math.round(target.y / 4)}`;
    if (key === previewKeyRef.current) return;
    previewKeyRef.current = key;
    const path = walkBetween(options.grid, from, target);
    previewRef.current = { points: path.points, reachable: path.reachable };
    options.onPreviewReach(path.reachable);
    repaint();
  };

  const updateHover = (point: RadarPoint, scale: number) => {
    const handle = handleAt(options.step, options.selectedSlot, point, overview, scale);
    const lineup =
      options.tool === 'grenade' && options.lineups !== undefined
        ? lineupAt(
            options.lineups,
            point,
            endOf(options.stepSchedule, options.selectedSlot) ?? point,
            overview,
            scale,
          )
        : null;
    const lineupId = lineup?.id ?? null;
    if (hoverRef.current.handle === handle && hoverRef.current.lineupId === lineupId) return;
    hoverRef.current = { handle, lineupId };
    options.onHover(hoverRef.current);
  };

  /** A press that starts a drag — pan or a waypoint — and says whether it did. */
  const beginDrag = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    point: RadarPoint,
    scale: number,
  ): boolean => {
    const slot = options.selectedSlot;
    let drag: Drag | null = null;
    if (event.button === 1 || (options.tool === 'select' && viewRef.current.zoom > 1)) {
      drag = { type: 'pan', x: event.clientX, y: event.clientY };
    } else if (options.tool !== 'grenade' && options.tool !== 'enemy' && slot !== null) {
      const index = handleAt(options.step, slot, point, overview, scale);
      if (index !== null) drag = { type: 'handle', slot, index };
    }
    if (drag === null) return false;
    dragRef.current = drag;
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  };

  /** A press with the enemy tool: picks and drags the mark under it, or puts a new one there. */
  const pressEnemy = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    point: RadarPoint,
    scale: number,
  ) => {
    const id = enemyAt(enemiesOf(options.step), point, overview, scale);
    if (id === null) {
      actions.onPlaceEnemy(toWorld(overview, point));
      return;
    }
    actions.onSelectEnemy(id);
    dragRef.current = { type: 'enemy', id };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  /** With the select tool, a press on an enemy mark picks it. */
  const pickEnemyAt = (point: RadarPoint, scale: number): boolean => {
    if (options.tool !== 'select') return false;
    const id = enemyAt(enemiesOf(options.step), point, overview, scale);
    if (id === null) return false;
    actions.onSelectEnemy(id);
    return true;
  };

  /** A press on a token or a spawn spot, which picks rather than draws. */
  const pickAt = (point: RadarPoint, scale: number): boolean => {
    const token = options.tool === 'pen' ? null : tokenAt(options.stepSchedule, point, scale);
    if (token !== null && options.tool !== 'grenade') {
      actions.onSelect(token);
      return true;
    }
    if (pickEnemyAt(point, scale)) return true;
    if (options.spawnSpots !== undefined && options.selectedSlot !== null) {
      const spot = nearestSpot(options.spawnSpots, point, overview, scale);
      if (spot !== null) {
        actions.onPickSpawn(spot);
        return true;
      }
    }
    if (options.tool !== 'select') return false;
    actions.onSelect(null);
    actions.onSelectEnemy(null);
    return true;
  };

  const placeGrenade = (slot: number, point: RadarPoint, scale: number) => {
    const lineup = options.lineups
      ? lineupAt(
          options.lineups,
          point,
          endOf(options.stepSchedule, slot) ?? point,
          overview,
          scale,
        )
      : null;
    if (lineup !== null) actions.onLineup(lineup);
    else actions.onHandThrow(toWorld(overview, point));
  };

  const drawWith = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    slot: number,
    point: RadarPoint,
    scale: number,
  ) => {
    if (options.tool === 'route') {
      actions.onAddWaypoint(slot, toWorld(overview, snapPoint(options.grid, point)));
    } else if (options.tool === 'pen') {
      penRef.current = [endOf(options.stepSchedule, slot) ?? point, point];
      liveStrokeRef.current = penRef.current;
      dragRef.current = { type: 'pen', slot };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else {
      placeGrenade(slot, point, scale);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const info = read(event);
    if (info === null) return;
    actions.onInteract();
    if (options.isShown) return;
    if (options.tool === 'enemy' && event.button !== 1) {
      pressEnemy(event, info.point, info.scale);
      return;
    }
    if (beginDrag(event, info.point, info.scale)) return;
    if (pickAt(info.point, info.scale)) return;

    const slot = options.selectedSlot;
    if (slot === null || options.stepSchedule?.legs[slot]?.isDead) return;
    drawWith(event, slot, info.point, info.scale);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const info = read(event);
    if (info === null) return;
    const drag = dragRef.current;

    if (drag?.type === 'pan') {
      const view = viewRef.current;
      view.panX += event.clientX - drag.x;
      view.panY += event.clientY - drag.y;
      dragRef.current = { type: 'pan', x: event.clientX, y: event.clientY };
      repaint();
      return;
    }
    if (drag?.type === 'handle') {
      actions.onMoveWaypoint(
        drag.slot,
        drag.index,
        toWorld(overview, snapPoint(options.grid, info.point)),
      );
      return;
    }
    if (drag?.type === 'enemy') {
      actions.onMoveEnemy(drag.id, toWorld(overview, info.point));
      return;
    }
    if (drag?.type === 'pen') {
      const last = penRef.current[penRef.current.length - 1];
      if (
        last !== undefined &&
        Math.hypot(last.x - info.point.x, last.y - info.point.y) > PEN_SPACING_RADAR_PX
      ) {
        penRef.current = [...penRef.current, info.point];
        liveStrokeRef.current = penRef.current;
        repaint();
      }
      return;
    }

    updateHover(info.point, info.scale);
    updatePreview(info.point);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag === null) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.type === 'pen') {
      const stroke = penRef.current.slice(1).map((point) => toWorld(overview, point));
      penRef.current = [];
      liveStrokeRef.current = null;
      if (stroke.length > 1) actions.onPenStroke(drag.slot, stroke);
      repaint();
    }
    actions.onEndGesture();
  };

  const handlePointerLeave = () => {
    clearPreview();
    if (hoverRef.current.handle !== null || hoverRef.current.lineupId !== null) {
      hoverRef.current = { handle: null, lineupId: null };
      options.onHover(hoverRef.current);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    event.preventDefault();
    zoomAbout(
      viewRef.current,
      event.deltaY < 0 ? 1.15 : 1 / 1.15,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      SQUARE_PLATE,
    );
    options.onZoomChange(viewRef.current.zoom);
    repaint();
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handleWheel };
}

function nearestSpot(
  spots: readonly TacticPoint[],
  point: RadarPoint,
  overview: MapOverview,
  scale: number,
): number | null {
  let best: number | null = null;
  let bestDistance = SPOT_HIT_PX / scale;
  spots.forEach((spot, index) => {
    const at = toRadar(overview, spot);
    const d = Math.hypot(at.x - point.x, at.y - point.y);
    if (d <= bestDistance) {
      bestDistance = d;
      best = index;
    }
  });
  return best;
}
