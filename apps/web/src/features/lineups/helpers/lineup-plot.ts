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

type Anchor = { readonly x: number; readonly y: number };

function sharedAnchor(anchors: Map<string, Anchor>, groupId: string, own: Anchor): Anchor {
  const existing = anchors.get(groupId);
  if (existing) return existing;
  anchors.set(groupId, own);
  return own;
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
  const landingAnchors = new Map<string, Anchor>();
  const originAnchors = new Map<string, Anchor>();

  for (let i = 0; i < lineups.length; i++) {
    const lineup = lineups[i];
    if (lineup === undefined) continue;

    let origin: Anchor = {
      x: radarX(overview, lineup.origin.x),
      y: radarY(overview, lineup.origin.y),
    };
    let landing: Anchor = {
      x: radarX(overview, lineup.landing.x),
      y: radarY(overview, lineup.landing.y),
    };

    if (lineup.groupId) {
      if ((lineup.groupTarget ?? 'landing') === 'landing') {
        landing = sharedAnchor(landingAnchors, lineup.groupId, landing);
      } else {
        origin = sharedAnchor(originAnchors, lineup.groupId, origin);
      }
    }

    const at = i * LINEUP_STRIDE;
    plot[at] = origin.x;
    plot[at + 1] = origin.y;
    plot[at + 2] = landing.x;
    plot[at + 3] = landing.y;
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

interface NodeSearch {
  readonly pt: { readonly x: number; readonly y: number };
  bestDistSq: number;
  bestNode: LineupNode | null;
}

function considerNode(
  search: NodeSearch,
  x: number,
  y: number,
  lineupIndex: number,
  target: LineupNode['target'],
  waypointIndex?: number,
): void {
  const dx = x - search.pt.x;
  const dy = y - search.pt.y;
  const distSq = dx * dx + dy * dy;
  if (distSq >= search.bestDistSq) return;
  search.bestDistSq = distSq;
  search.bestNode =
    waypointIndex === undefined ? { lineupIndex, target } : { lineupIndex, target, waypointIndex };
}

function considerWaypoints(
  search: NodeSearch,
  waypoints: readonly { readonly x: number; readonly y: number }[],
  overview: { readonly posX: number; readonly posY: number; readonly scale: number },
  lineupIndex: number,
): void {
  for (let w = 0; w < waypoints.length; w++) {
    const wp = waypoints[w];
    if (!wp) continue;
    const wx = (wp.x - overview.posX) / overview.scale;
    const wy = (overview.posY - wp.y) / overview.scale;
    considerNode(search, wx, wy, lineupIndex, 'waypoint', w);
  }
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
  const search: NodeSearch = { pt, bestDistSq: maxRadarDist * maxRadarDist, bestNode: null };

  for (let i = 0; i < lineups.length; i++) {
    const at = i * LINEUP_STRIDE;
    const ox = plot[at];
    const oy = plot[at + 1];
    const lx = plot[at + 2];
    const ly = plot[at + 3];
    if (ox === undefined || oy === undefined || lx === undefined || ly === undefined) continue;

    considerNode(search, ox, oy, i, 'origin');
    considerNode(search, lx, ly, i, 'landing');
    const waypoints = lineups[i]?.waypoints;
    if (waypoints) considerWaypoints(search, waypoints, overview, i);
  }

  return search.bestNode;
}
