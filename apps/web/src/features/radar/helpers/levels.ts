import type { MapOverview, RadarLevel } from '@disa/map-data';

export function levelAt(overview: MapOverview, index: number): RadarLevel {
  return overview.levels[index] ?? overview.levels[0];
}
