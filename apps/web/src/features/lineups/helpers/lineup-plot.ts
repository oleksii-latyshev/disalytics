import type { Lineup } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';

/** Origin radar x, origin radar y, landing radar x, landing radar y. */
export const LINEUP_STRIDE = 4;

export interface LineupGroup {
  readonly indices: readonly number[];
  readonly countLabel: string;
}

export type LineupOriginGroup = LineupGroup;

// Standard smoke radius in CS2 is 144 units. Grenades thrown to the same location
// from different spawns naturally land within ~120-150 units of each other.
const CLUSTER_THRESHOLD_SQ = 150 * 150;

function groupLineupsByPoint(
  lineups: readonly Lineup[],
  getPoint: (lineup: Lineup) => { readonly x: number; readonly y: number },
): readonly LineupGroup[] {
  const groups: { indices: number[]; countLabel: string }[] = [];
  for (let index = 0; index < lineups.length; index++) {
    const lineup = lineups[index];
    if (lineup === undefined) continue;
    const pt = getPoint(lineup);
    const group = groups.find(({ indices }) => {
      const first = lineups[indices[0] ?? -1];
      if (first === undefined) return false;
      const firstPt = getPoint(first);
      const dx = firstPt.x - pt.x;
      const dy = firstPt.y - pt.y;
      return dx * dx + dy * dy < CLUSTER_THRESHOLD_SQ;
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

export function groupLineupsByOrigin(lineups: readonly Lineup[]): readonly LineupGroup[] {
  return groupLineupsByPoint(lineups, (l) => l.origin);
}

export function groupLineupsByLanding(lineups: readonly Lineup[]): readonly LineupGroup[] {
  return groupLineupsByPoint(lineups, (l) => l.landing);
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

export type LineupMarkerTarget = 'origin' | 'landing';

export interface LineupHit {
  readonly index: number;
  readonly target: LineupMarkerTarget;
}

/** Finds the nearest lineup origin or landing within `maxDistPx` of the click point, or `null`. */
export function findNearestLineupTarget(
  pt: { x: number; y: number },
  plot: Float32Array,
  lineupsCount: number,
  scale: number,
  maxDistPx: number,
): LineupHit | null {
  const maxRadarDist = maxDistPx / scale;
  const maxRadarDistSq = maxRadarDist * maxRadarDist;
  let bestHit: LineupHit | null = null;
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
    const distSqOrigin = dOx * dOx + dOy * dOy;

    const dLx = lx - pt.x;
    const dLy = ly - pt.y;
    const distSqLanding = dLx * dLx + dLy * dLy;

    if (distSqOrigin < bestDistSq) {
      bestDistSq = distSqOrigin;
      bestHit = { index: i, target: 'origin' };
    }
    if (distSqLanding < bestDistSq) {
      bestDistSq = distSqLanding;
      bestHit = { index: i, target: 'landing' };
    }
  }

  return bestHit;
}

/** Finds the nearest lineup origin or landing within `maxDistPx` of the click point, or `null`. */
export function findNearestLineup(
  pt: { x: number; y: number },
  plot: Float32Array,
  lineupsCount: number,
  scale: number,
  maxDistPx: number,
): number | null {
  return findNearestLineupTarget(pt, plot, lineupsCount, scale, maxDistPx)?.index ?? null;
}
