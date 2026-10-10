import { type MapOverview, type RadarPoint, radarToWorld, radarX, radarY } from '@disa/map-data';

/** Transforms a world point to 1024x1024 radar coordinates. */
export function tacticWorldToRadar(
  overview: MapOverview,
  pt: { readonly x: number; readonly y: number },
): RadarPoint {
  return { x: radarX(overview, pt.x), y: radarY(overview, pt.y) };
}

/** Transforms a 1024x1024 radar coordinate back to game world space. */
export function tacticRadarToWorld(
  overview: MapOverview,
  pt: RadarPoint,
): { readonly x: number; readonly y: number } {
  return radarToWorld(overview, pt);
}
