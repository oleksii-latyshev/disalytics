import type { UtilityThrow, WorldPoint } from '@disa/demo-core';
import { END_STRIDE, ENDS_LENGTH } from './throw-layer';

/** Standard smoke radius in CS2 is 144 units; throws landing within 150 units form a cluster. */
export const CLUSTER_THRESHOLD_SQ = 150 * 150;

export interface ThrowCluster {
  readonly indices: readonly number[];
  readonly countLabel: string;
  readonly landing: WorldPoint;
}

/**
 * Groups grenade throws by landing point proximity in map world coordinates.
 * Throws whose landing points fall within 150 map units of the cluster's first throw
 * are grouped together.
 */
export function groupThrowsByLanding(throws: readonly UtilityThrow[]): readonly ThrowCluster[] {
  const clusters: { indices: number[]; countLabel: string; landing: WorldPoint }[] = [];

  for (let index = 0; index < throws.length; index++) {
    const thrown = throws[index];
    if (thrown === undefined) continue;
    const pt = thrown.landing;

    const cluster = clusters.find((candidate) => {
      const dx = candidate.landing.x - pt.x;
      const dy = candidate.landing.y - pt.y;
      return dx * dx + dy * dy < CLUSTER_THRESHOLD_SQ;
    });

    if (cluster === undefined) {
      clusters.push({
        indices: [index],
        countLabel: '1',
        landing: pt,
      });
    } else {
      cluster.indices.push(index);
      cluster.countLabel = String(cluster.indices.length);
    }
  }

  return clusters;
}

/**
 * Finds the nearest cluster within `maxDistPx` of the click point, checking both
 * the landing point and badge positions.
 */
export function findNearestCluster(
  pt: { readonly x: number; readonly y: number },
  clusters: readonly ThrowCluster[],
  plot: Float32Array,
  scale: number,
  maxDistPx: number,
): ThrowCluster | null {
  let bestCluster: ThrowCluster | null = null;
  let bestDistPx = maxDistPx;

  for (const cluster of clusters) {
    const firstIndex = cluster.indices[0];
    if (firstIndex === undefined) continue;

    const base = firstIndex * ENDS_LENGTH;
    const lx = plot[base + END_STRIDE];
    const ly = plot[base + END_STRIDE + 1];
    if (lx === undefined || ly === undefined) continue;

    const dLandingPx = Math.hypot(lx - pt.x, ly - pt.y) * scale;
    if (dLandingPx < bestDistPx) {
      bestDistPx = dLandingPx;
      bestCluster = cluster;
    }

    if (cluster.indices.length >= 2) {
      const dxBadgePx = (lx - pt.x) * scale + 10;
      const dyBadgePx = (ly - pt.y) * scale + 10;
      const dBadgePx = Math.hypot(dxBadgePx, dyBadgePx);
      if (dBadgePx < bestDistPx) {
        bestDistPx = dBadgePx;
        bestCluster = cluster;
      }
    }
  }

  return bestCluster;
}
