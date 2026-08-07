import { MAP_OVERVIEWS, type MapId } from './generated/overviews';
import type { MapOverview, RadarLevel, RadarPoint } from './types';

export function isMapId(value: string): value is MapId {
  return Object.hasOwn(MAP_OVERVIEWS, value);
}

/** `undefined` for a map outside the pool — a demo can name any map, including a workshop one. */
export function getMapOverview(value: string): MapOverview | undefined {
  return isMapId(value) ? MAP_OVERVIEWS[value] : undefined;
}

/**
 * `AGENTS.md` §9. Y is inverted because the overview's `posY` is the *upper* edge in world space
 * while image rows count downward.
 */
export function worldToRadar(
  overview: MapOverview,
  point: { readonly x: number; readonly y: number },
): RadarPoint {
  return {
    x: (point.x - overview.posX) / overview.scale,
    y: (overview.posY - point.y) / overview.scale,
  };
}

/**
 * The level whose altitude band contains `z`. Valve's bands touch at their boundary and are read
 * half-open — `altitudeMin` belongs to the band below, so a player standing exactly on Nuke's
 * split reads as being on the lower floor. Out-of-band altitudes fall back to the default level.
 */
export function radarLevelAt(overview: MapOverview, z: number): RadarLevel {
  return (
    overview.levels.find((level) => z <= level.altitudeMax && z > level.altitudeMin) ??
    overview.levels[0]
  );
}
