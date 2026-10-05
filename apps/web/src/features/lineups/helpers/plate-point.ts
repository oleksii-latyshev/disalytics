import type { WorldPoint } from '@disa/demo-core';
import {
  type MapOverview,
  plateToRadar,
  plateX,
  plateY,
  type RadarLevel,
  radarToWorld,
} from '@disa/map-data';
import type { PlatePoint } from '@/features/radar';

/** Where on the plate a world point is drawn, on the floor its altitude is on. */
export function platePointOf(overview: MapOverview, point: WorldPoint): PlatePoint {
  return { x: plateX(overview, point.x, point.z), y: plateY(overview, point.y, point.z) };
}

/** An altitude inside the band of `level`, as near ground level as the band allows. */
function altitudeWithin(level: RadarLevel): number {
  return Math.min(Math.max(0, level.altitudeMin + 1), level.altitudeMax);
}

/**
 * The world point under a plate point. A map with one floor leaves the altitude at 0, which is
 * what a click can know; a stacked map takes one inside the floor the click fell on, so the point
 * is drawn on that floor again.
 */
export function worldPointAt(overview: MapOverview, plate: PlatePoint): WorldPoint {
  const radar = plateToRadar(overview, plate.x, plate.y);
  const ground = radarToWorld(overview, radar);
  const level = overview.levels[radar.levelIndex];

  return {
    x: ground.x,
    y: ground.y,
    z: overview.levels.length > 1 && level !== undefined ? altitudeWithin(level) : 0,
  };
}

/** The altitude a dragged point is given: nothing on a map with one floor, which keeps its own. */
export function altitudeOnDrop(overview: MapOverview, plate: PlatePoint): number | undefined {
  return overview.levels.length > 1 ? worldPointAt(overview, plate).z : undefined;
}
