import type { WorldPoint } from '@disa/demo-core';
import { type MapOverview, plateToRadar, plateX, plateY, radarToWorld } from '@disa/map-data';
import type { PlatePoint } from '@disa/plate';

/** Where on the plate a world point is drawn, on the floor its altitude is on. */
export function platePointOf(overview: MapOverview, point: WorldPoint): PlatePoint {
  return { x: plateX(overview, point.x, point.z), y: plateY(overview, point.y, point.z) };
}

/**
 * The world point under a plate point. A map with one floor keeps the altitude the point had; a
 * stacked map takes one inside the floor the click fell on, so the point is drawn there again.
 */
export function worldPointAt(
  overview: MapOverview,
  plate: PlatePoint,
  previous: WorldPoint,
): WorldPoint {
  const radar = plateToRadar(overview, plate.x, plate.y);
  const ground = radarToWorld(overview, radar);
  const level = overview.levels[radar.levelIndex];
  if (overview.levels.length === 1 || level === undefined) {
    return { x: ground.x, y: ground.y, z: previous.z };
  }
  return {
    x: ground.x,
    y: ground.y,
    z: Math.min(Math.max(0, level.altitudeMin + 1), level.altitudeMax),
  };
}

/** World units between two points on the ground plane. */
export function gapUnits(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
