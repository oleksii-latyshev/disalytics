import type { TacticPoint, TacticRoute } from '@disa/demo-core';
import {
  type FloorPoint,
  findFloorPath,
  floorAt,
  floorRefZ,
  type MapOverview,
  mapFloors,
  type NavGrid,
  type RadarPoint,
  radarToWorld,
  radarX,
  radarY,
  snapToWalkable,
} from '@disa/map-data';

/**
 * Routes are walked in radar pixels, one floor at a time, joined through the connectors the grid
 * learned from real players (a stair between Nuke's floors, Mirage's way into the underpass). The
 * grid is traced from the radar picture, so every path it gives is a named approximation, never a
 * Valve nav mesh. A point's floor is the one its altitude `z` is on; a point with none is on
 * floor 0, which is what a tactic saved before floors existed holds.
 */

export interface WalkedRoute {
  /** Radar pixels, the first being where the player starts; each says which floor it is on. */
  readonly points: readonly FloorPoint[];
  /** Indices `i` whose segment `i → i + 1` the grid could not join, so it is drawn straight. */
  readonly breaks: readonly number[];
}

export function toRadar(overview: MapOverview, point: TacticPoint): RadarPoint {
  return { x: radarX(overview, point.x), y: radarY(overview, point.y) };
}

/** The floor a tactic point is on. */
export function floorOfPoint(overview: MapOverview, point: TacticPoint): number {
  return floorAt(overview, point.x, point.y, point.z);
}

export function toFloorPoint(overview: MapOverview, point: TacticPoint): FloorPoint {
  return { ...toRadar(overview, point), floor: floorOfPoint(overview, point) };
}

/**
 * A radar pixel on `floor` as the world point the tactic stores, rounded to whole units. On a map
 * with more than one floor it carries that floor's representative altitude, which is how the floor
 * is saved; a one-floor map keeps no altitude.
 */
export function toWorld(overview: MapOverview, point: RadarPoint, floor = 0): TacticPoint {
  const world = radarToWorld(overview, point);
  const rounded = { x: Math.round(world.x), y: Math.round(world.y) };
  if (mapFloors(overview).length < 2) return rounded;
  return { ...rounded, z: floorRefZ(overview, floor) };
}

export function walkBetween(
  grid: NavGrid | undefined,
  from: FloorPoint,
  to: FloorPoint,
): { readonly points: readonly FloorPoint[]; readonly reachable: boolean } {
  if (grid?.levels[from.floor] === undefined || grid.levels[to.floor] === undefined) {
    return { points: [from, to], reachable: true };
  }
  return findFloorPath(grid, from, to);
}

/** The nearest walkable pixel of its floor to a click, or the click itself while there is no grid. */
export function snapPoint(grid: NavGrid | undefined, point: FloorPoint): FloorPoint {
  const level = grid?.levels[point.floor];
  if (level === undefined) return point;
  const snapped = snapToWalkable(level, point);
  return snapped === undefined ? point : { x: snapped.x, y: snapped.y, floor: point.floor };
}

export function walkRoute(
  overview: MapOverview,
  grid: NavGrid | undefined,
  start: FloorPoint,
  route: TacticRoute,
): WalkedRoute {
  const waypoints = route.points.map((point) => toFloorPoint(overview, point));
  if (route.mode === 'pen') {
    const points = [start, ...waypoints];
    return { points, breaks: [] };
  }

  const points: FloorPoint[] = [start];
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
