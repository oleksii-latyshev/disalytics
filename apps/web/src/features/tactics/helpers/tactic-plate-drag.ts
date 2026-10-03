import type { TacticDrawingStroke, TacticThrow, UtilityKind } from '@disa/demo-core';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import { type PlateView, panBy, SQUARE_PLATE } from '@/features/radar';
import type { InterpolatedTacticState } from './tactic-interpolation';
import { findNearestTacticPlayer, findNearestTacticThrow, tacticRadarToWorld } from './tactic-plot';

export type DragState =
  | { readonly type: 'player'; readonly slot: number }
  | { readonly type: 'throw'; readonly throwId: string; readonly end: 'from' | 'to' }
  | { readonly type: 'pan'; startX: number; startY: number }
  | { readonly type: 'pencil'; readonly points: { x: number; y: number }[] }
  | { readonly type: 'throw_create'; readonly from: { x: number; y: number } }
  | null;

export type HitTarget =
  | { readonly type: 'player'; readonly slot: number }
  | { readonly type: 'throw'; readonly throwId: string; readonly end: 'from' | 'to' }
  | null;

export function checkPointerHit(
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

export function resolveHitDragState(
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

export function findNearestDrawingStroke(
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

export interface PerformDragOptions {
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

export function performDragMove(options: PerformDragOptions): void {
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
    panBy(view, dx, dy, box, SQUARE_PLATE);
    dragState.startX = clientX;
    dragState.startY = clientY;
    repaint?.();
  }
}
