import type { Lineup } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';

/** Origin radar x, origin radar y, landing radar x, landing radar y. */
export const LINEUP_STRIDE = 4;

export interface LineupOriginGroup {
  readonly indices: readonly number[];
  readonly countLabel: string;
}

export function groupLineupsByOrigin(lineups: readonly Lineup[]): readonly LineupOriginGroup[] {
  const groups: { indices: number[]; countLabel: string }[] = [];
  for (let index = 0; index < lineups.length; index++) {
    const lineup = lineups[index];
    if (lineup === undefined) continue;
    const group = groups.find(({ indices }) => {
      const first = lineups[indices[0] ?? -1];
      if (first === undefined) return false;
      const dx = first.origin.x - lineup.origin.x;
      const dy = first.origin.y - lineup.origin.y;
      return dx * dx + dy * dy < 80 * 80;
    });
    if (group === undefined) {
      groups.push({ indices: [index], countLabel: '1' });
    } else {
      group.indices.push(index);
      group.countLabel = String(group.indices.length);
    }
  }
  return groups;
}

/**
 * Computes radar coordinates for a list of lineups on the given map overview.
 *
 * Radar coordinates are normalized to [0, RADAR_IMAGE_SIZE] (0..1024), so resizing
 * the canvas scales the precomputed plot without reprojecting world coordinates.
 */
export function lineupPlot(overview: MapOverview, lineups: readonly Lineup[]): Float32Array {
  const plot = new Float32Array(lineups.length * LINEUP_STRIDE);

  for (let i = 0; i < lineups.length; i++) {
    const lineup = lineups[i];
    if (lineup === undefined) continue;

    const at = i * LINEUP_STRIDE;
    plot[at] = radarX(overview, lineup.origin.x);
    plot[at + 1] = radarY(overview, lineup.origin.y);
    plot[at + 2] = radarX(overview, lineup.landing.x);
    plot[at + 3] = radarY(overview, lineup.landing.y);
  }

  return plot;
}

/** Finds the nearest lineup origin or landing within `maxDistPx` of the click point, or `null`. */
export function findNearestLineup(
  pt: { x: number; y: number },
  plot: Float32Array,
  lineupsCount: number,
  scale: number,
  maxDistPx: number,
): number | null {
  const maxRadarDist = maxDistPx / scale;
  const maxRadarDistSq = maxRadarDist * maxRadarDist;
  let bestIndex: number | null = null;
  let bestDistSq = maxRadarDistSq;

  for (let i = 0; i < lineupsCount; i++) {
    const at = i * LINEUP_STRIDE;
    const ox = plot[at];
    const oy = plot[at + 1];
    const lx = plot[at + 2];
    const ly = plot[at + 3];
    if (ox === undefined || oy === undefined || lx === undefined || ly === undefined) continue;

    const dOx = ox - pt.x;
    const dOy = oy - pt.y;
    const dLx = lx - pt.x;
    const dLy = ly - pt.y;

    const distSq = Math.min(dOx * dOx + dOy * dOy, dLx * dLx + dLy * dLy);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }

  return bestIndex;
}
