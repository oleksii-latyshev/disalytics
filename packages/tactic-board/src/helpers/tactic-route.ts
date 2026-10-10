import type { TacticPoint, TacticRoute } from '@disa/demo-core';
import {
  findNavPath,
  type MapOverview,
  type NavGrid,
  type RadarPoint,
  radarToWorld,
  radarX,
  radarY,
  snapToWalkable,
} from '@disa/map-data';

/**
 * Routes are walked in radar pixels, on the first level of the grid — the one floor the tactic
 * plate shows. The grid is traced from the radar picture, so every path it gives is a named
 * approximation, never a Valve nav mesh.
 */

export interface WalkedRoute {
  /** Radar pixels, the first being where the player starts. */
  readonly points: readonly RadarPoint[];
  /** Indices `i` whose segment `i → i + 1` the grid could not join, so it is drawn straight. */
  readonly breaks: readonly number[];
}

export function toRadar(overview: MapOverview, point: TacticPoint): RadarPoint {
  return { x: radarX(overview, point.x), y: radarY(overview, point.y) };
}

/** A radar pixel as the world point the tactic stores, rounded to whole units. */
export function toWorld(overview: MapOverview, point: RadarPoint): TacticPoint {
  const world = radarToWorld(overview, point);
  return { x: Math.round(world.x), y: Math.round(world.y) };
}

export function walkBetween(
  grid: NavGrid | undefined,
  from: RadarPoint,
  to: RadarPoint,
): { readonly points: readonly RadarPoint[]; readonly reachable: boolean } {
  const level = grid?.levels[0];
  if (level === undefined) return { points: [from, to], reachable: true };
  return findNavPath(level, from, to);
}

/** The nearest walkable pixel to a click, or the click itself while there is no grid. */
export function snapPoint(grid: NavGrid | undefined, point: RadarPoint): RadarPoint {
  const level = grid?.levels[0];
  if (level === undefined) return point;
  return snapToWalkable(level, point) ?? point;
}

export function walkRoute(
  overview: MapOverview,
  grid: NavGrid | undefined,
  start: RadarPoint,
  route: TacticRoute,
): WalkedRoute {
  const waypoints = route.points.map((point) => toRadar(overview, point));
  if (route.mode === 'pen') {
    const points = [start, ...waypoints];
    return { points, breaks: [] };
  }

  const points: RadarPoint[] = [start];
  const breaks: number[] = [];
  let current = start;
  for (const waypoint of waypoints) {
    const leg = walkBetween(grid, current, waypoint);
    if (!leg.reachable) breaks.push(points.length - 1);
    for (const point of leg.points.slice(1)) points.push(point);
    current = leg.points[leg.points.length - 1] ?? current;
  }
  return { points, breaks };
}
