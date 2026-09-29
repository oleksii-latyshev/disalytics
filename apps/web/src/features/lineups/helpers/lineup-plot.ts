import type { Lineup } from '@disa/demo-core';
import { type MapOverview, radarX, radarY } from '@disa/map-data';

/** Origin radar x, origin radar y, landing radar x, landing radar y. */
export const LINEUP_STRIDE = 4;

export interface LineupGroup {
  readonly indices: readonly number[];
  readonly countLabel: string;
}

export type LineupOriginGroup = LineupGroup;

function groupLineupsByTarget(
  lineups: readonly Lineup[],
  target: 'origin' | 'landing',
): readonly LineupGroup[] {
  const groupsByGroupId = new Map<string, number[]>();

  for (let index = 0; index < lineups.length; index++) {
    const lineup = lineups[index];
    if (lineup === undefined || !lineup.groupId) continue;
    const lineupTarget = lineup.groupTarget ?? 'landing';
    if (lineupTarget !== target) continue;

    const existing = groupsByGroupId.get(lineup.groupId);
    if (existing) {
      existing.push(index);
    } else {
      groupsByGroupId.set(lineup.groupId, [index]);
    }
  }

  const groups: LineupGroup[] = [];
  for (const indices of groupsByGroupId.values()) {
    if (indices.length >= 2) {
      groups.push({ indices, countLabel: String(indices.length) });
    }
  }
  return groups;
}

export function groupLineupsByOrigin(lineups: readonly Lineup[]): readonly LineupGroup[] {
  return groupLineupsByTarget(lineups, 'origin');
}

export function groupLineupsByLanding(lineups: readonly Lineup[]): readonly LineupGroup[] {
  return groupLineupsByTarget(lineups, 'landing');
}

/**
 * Computes radar coordinates for a list of lineups on the given map overview.
 *
 * Radar coordinates are normalized to [0, RADAR_IMAGE_SIZE] (0..1024), so resizing
 * the canvas scales the precomputed plot without reprojecting world coordinates.
 * Lineups manually merged with groupId share their primary group point coordinates.
 */
export function lineupPlot(overview: MapOverview, lineups: readonly Lineup[]): Float32Array {
  const plot = new Float32Array(lineups.length * LINEUP_STRIDE);
  const groupLandingMap = new Map<string, { x: number; y: number }>();
  const groupOriginMap = new Map<string, { x: number; y: number }>();

  for (let i = 0; i < lineups.length; i++) {
    const lineup = lineups[i];
    if (lineup === undefined) continue;

    const at = i * LINEUP_STRIDE;
    let ox = radarX(overview, lineup.origin.x);
    let oy = radarY(overview, lineup.origin.y);
    let lx = radarX(overview, lineup.landing.x);
    let ly = radarY(overview, lineup.landing.y);

    if (lineup.groupId) {
      const target = lineup.groupTarget ?? 'landing';
      if (target === 'landing') {
        const existing = groupLandingMap.get(lineup.groupId);
        if (existing) {
          lx = existing.x;
          ly = existing.y;
        } else {
          groupLandingMap.set(lineup.groupId, { x: lx, y: ly });
        }
      } else if (target === 'origin') {
        const existing = groupOriginMap.get(lineup.groupId);
        if (existing) {
          ox = existing.x;
          oy = existing.y;
        } else {
          groupOriginMap.set(lineup.groupId, { x: ox, y: oy });
        }
      }
    }

    plot[at] = ox;
    plot[at + 1] = oy;
    plot[at + 2] = lx;
    plot[at + 3] = ly;
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

/** Identifies a specific draggable point on a lineup. */
export interface LineupNode {
  readonly lineupIndex: number;
  readonly target: 'origin' | 'landing' | 'waypoint';
  readonly waypointIndex?: number | undefined;
}

/**
 * Finds the closest individual node (origin, landing, or waypoint) within
 * `maxDistPx` of `pt`. Unlike `findNearestLineupTarget` which only checks
 * origin/landing from the plot array, this also checks waypoints from the
 * lineup data directly.
 */
export function findNearestNode(
  pt: { x: number; y: number },
  plot: Float32Array,
  lineups: readonly {
    readonly waypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  }[],
  overview: { readonly posX: number; readonly posY: number; readonly scale: number },
  scale: number,
  maxDistPx: number,
): LineupNode | null {
  const maxRadarDist = maxDistPx / scale;
  const maxRadarDistSq = maxRadarDist * maxRadarDist;
  let bestNode: LineupNode | null = null;
  let bestDistSq = maxRadarDistSq;

  for (let i = 0; i < lineups.length; i++) {
    const at = i * LINEUP_STRIDE;
    const ox = plot[at];
    const oy = plot[at + 1];
    const lx = plot[at + 2];
    const ly = plot[at + 3];
    if (ox === undefined || oy === undefined || lx === undefined || ly === undefined) continue;

    const dOx = ox - pt.x;
    const dOy = oy - pt.y;
    const distSqOrigin = dOx * dOx + dOy * dOy;
    if (distSqOrigin < bestDistSq) {
      bestDistSq = distSqOrigin;
      bestNode = { lineupIndex: i, target: 'origin' };
    }

    const dLx = lx - pt.x;
    const dLy = ly - pt.y;
    const distSqLanding = dLx * dLx + dLy * dLy;
    if (distSqLanding < bestDistSq) {
      bestDistSq = distSqLanding;
      bestNode = { lineupIndex: i, target: 'landing' };
    }

    const lineup = lineups[i];
    if (lineup?.waypoints) {
      for (let w = 0; w < lineup.waypoints.length; w++) {
        const wp = lineup.waypoints[w];
        if (!wp) continue;
        // Convert waypoint world coords to radar coords inline
        const wx = (wp.x - overview.posX) / overview.scale;
        const wy = (overview.posY - wp.y) / overview.scale;
        const dWx = wx - pt.x;
        const dWy = wy - pt.y;
        const distSqWp = dWx * dWx + dWy * dWy;
        if (distSqWp < bestDistSq) {
          bestDistSq = distSqWp;
          bestNode = { lineupIndex: i, target: 'waypoint', waypointIndex: w };
        }
      }
    }
  }

  return bestNode;
}
