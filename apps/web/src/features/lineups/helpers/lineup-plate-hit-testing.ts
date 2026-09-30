import type { Lineup } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';

export interface HandleTarget {
  readonly target: 'origin' | 'landing' | 'waypoint';
  readonly waypointIndex?: number | undefined;
}

export const HIT_RADIUS_PX = 20;
export const HANDLE_RADIUS_PX = 16;

export function findHandleUnderPoint(
  pt: { readonly x: number; readonly y: number },
  lineup: Lineup,
  overview: MapOverview,
  scale: number,
  hitRadiusPx = HANDLE_RADIUS_PX,
): HandleTarget | null {
  const maxRadarDist = hitRadiusPx / scale;
  const maxDistSq = maxRadarDist * maxRadarDist;

  const ox = radarX(overview, lineup.origin.x);
  const oy = radarY(overview, lineup.origin.y);
  const dOx = ox - pt.x;
  const dOy = oy - pt.y;
  if (dOx * dOx + dOy * dOy <= maxDistSq) {
    return { target: 'origin' };
  }

  const lx = radarX(overview, lineup.landing.x);
  const ly = radarY(overview, lineup.landing.y);
  const dLx = lx - pt.x;
  const dLy = ly - pt.y;
  if (dLx * dLx + dLy * dLy <= maxDistSq) {
    return { target: 'landing' };
  }

  if (lineup.waypoints) {
    for (let w = 0; w < lineup.waypoints.length; w++) {
      const wp = lineup.waypoints[w];
      if (!wp) continue;
      const wx = radarX(overview, wp.x);
      const wy = radarY(overview, wp.y);
      const dWx = wx - pt.x;
      const dWy = wy - pt.y;
      if (dWx * dWx + dWy * dWy <= maxDistSq) {
        return { target: 'waypoint', waypointIndex: w };
      }
    }
  }

  return null;
}
