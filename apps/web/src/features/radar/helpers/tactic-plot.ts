import type { TacticDrawingStroke, TacticPlayerPosition, TacticThrow } from '@disa/demo-core';
import { type MapOverview, type RadarPoint, radarToWorld, radarX, radarY } from '@disa/map-data';
import { pointDistance, pointToSegmentDistance } from './coach-draw';

/**
 * Transforms a world point to 1024x1024 radar coordinates.
 */
export function tacticWorldToRadar(
  overview: MapOverview,
  pt: { readonly x: number; readonly y: number },
): RadarPoint {
  return {
    x: radarX(overview, pt.x),
    y: radarY(overview, pt.y),
  };
}

/**
 * Transforms a 1024x1024 radar coordinate back to game world space.
 */
export function tacticRadarToWorld(
  overview: MapOverview,
  pt: RadarPoint,
): { readonly x: number; readonly y: number } {
  return radarToWorld(overview, pt);
}

export interface PlayerHitResult {
  readonly slot: number;
  readonly index: number;
  readonly radarPoint: RadarPoint;
}

/**
 * Finds the nearest player token within screen distance threshold.
 */
export function findNearestTacticPlayer(
  radarPt: RadarPoint,
  players: readonly TacticPlayerPosition[],
  overview: MapOverview,
  scale: number,
  maxDistPx = 20,
): PlayerHitResult | null {
  const maxRadarDist = maxDistPx / scale;
  let bestSlot: number | null = null;
  let bestIndex = -1;
  let bestDist = maxRadarDist;
  let bestRadarPoint: RadarPoint = { x: 0, y: 0 };

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player === undefined) continue;

    const rPoint = tacticWorldToRadar(overview, player);
    const dist = pointDistance(rPoint, radarPt);

    if (dist <= bestDist) {
      bestDist = dist;
      bestSlot = player.slot;
      bestIndex = i;
      bestRadarPoint = rPoint;
    }
  }

  if (bestSlot === null) return null;

  return {
    slot: bestSlot,
    index: bestIndex,
    radarPoint: bestRadarPoint,
  };
}

export interface ThrowHitResult {
  readonly throwId: string;
  readonly index: number;
  readonly end: 'from' | 'to';
  readonly radarPoint: RadarPoint;
}

/**
 * Finds the nearest throw origin or landing point within screen distance threshold.
 */
export function findNearestTacticThrow(
  radarPt: RadarPoint,
  throws: readonly TacticThrow[],
  overview: MapOverview,
  scale: number,
  maxDistPx = 18,
): ThrowHitResult | null {
  const maxRadarDist = maxDistPx / scale;
  let bestResult: ThrowHitResult | null = null;
  let bestDist = maxRadarDist;

  for (let i = 0; i < throws.length; i++) {
    const t = throws[i];
    if (t === undefined) continue;

    const rFrom = tacticWorldToRadar(overview, t.from);
    const distFrom = pointDistance(rFrom, radarPt);
    if (distFrom <= bestDist) {
      bestDist = distFrom;
      bestResult = {
        throwId: t.id,
        index: i,
        end: 'from',
        radarPoint: rFrom,
      };
    }

    const rTo = tacticWorldToRadar(overview, t.to);
    const distTo = pointDistance(rTo, radarPt);
    if (distTo <= bestDist) {
      bestDist = distTo;
      bestResult = {
        throwId: t.id,
        index: i,
        end: 'to',
        radarPoint: rTo,
      };
    }
  }

  return bestResult;
}

function distanceToStroke(
  radarPt: RadarPoint,
  stroke: TacticDrawingStroke,
  overview: MapOverview,
): number {
  const { points } = stroke;
  const first = points[0];
  if (first === undefined) return Number.POSITIVE_INFINITY;

  const rFirst = tacticWorldToRadar(overview, first);
  if (points.length === 1) {
    return pointDistance(rFirst, radarPt);
  }

  let minDist = Number.POSITIVE_INFINITY;
  let prev = rFirst;
  for (let j = 1; j < points.length; j++) {
    const pt = points[j];
    if (pt === undefined) continue;

    const current = tacticWorldToRadar(overview, pt);
    const d = pointToSegmentDistance(radarPt, prev, current);
    if (d < minDist) {
      minDist = d;
    }
    prev = current;
  }
  return minDist;
}

/**
 * Finds the nearest tactic drawing stroke within screen distance threshold.
 */
export function findNearestTacticDrawing(
  radarPt: RadarPoint,
  drawings: readonly TacticDrawingStroke[],
  overview: MapOverview,
  scale: number,
  maxDistPx = 14,
): number | null {
  const maxRadarDist = maxDistPx / scale;
  let bestIndex: number | null = null;
  let bestDist = maxRadarDist;

  for (let i = drawings.length - 1; i >= 0; i--) {
    const stroke = drawings[i];
    if (stroke === undefined || stroke.points.length === 0) continue;

    const d = distanceToStroke(radarPt, stroke, overview);
    if (d <= bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}
