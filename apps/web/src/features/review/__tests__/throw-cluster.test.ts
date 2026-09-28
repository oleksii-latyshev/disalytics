import {
  asFrame,
  asPlayerSlot,
  asTick,
  type Grenade,
  type UtilityThrow,
  type WorldPoint,
} from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  CLUSTER_THRESHOLD_SQ,
  findNearestCluster,
  groupThrowsByLanding,
} from '../helpers/throw-cluster';

function makeMockThrow(x: number, y: number, z = 0, frame = 100): UtilityThrow {
  const landing: WorldPoint = { x, y, z };
  const grenade: Grenade = {
    thrower: asPlayerSlot(0),
    type: 'smokegrenade',
    throwTick: asTick(1000),
    detonationTick: asTick(1200),
    detonationPosition: landing,
    expiryTick: asTick(2000),
    trajectory: {
      sampleHz: 16,
      firstTick: asTick(1000),
      sampleCount: 1,
      x: new Float32Array([x]),
      y: new Float32Array([y]),
      z: new Float32Array([z]),
    },
  };

  return {
    roundIndex: 0,
    grenade,
    throwerSide: 'CT',
    frame: asFrame(frame),
    landing,
  };
}

describe('groupThrowsByLanding', () => {
  it('returns empty array when given no throws', () => {
    expect(groupThrowsByLanding([])).toEqual([]);
  });

  it('groups a single throw into its own cluster', () => {
    const t0 = makeMockThrow(100, 200);
    const clusters = groupThrowsByLanding([t0]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.indices).toEqual([0]);
    expect(clusters[0]?.countLabel).toBe('1');
    expect(clusters[0]?.landing).toEqual({ x: 100, y: 200, z: 0 });
  });

  it('groups multiple throws within CLUSTER_THRESHOLD into one cluster', () => {
    const t0 = makeMockThrow(100, 200);
    const t1 = makeMockThrow(150, 230); // dist sq = 50^2 + 30^2 = 2500 + 900 = 3400 < 22500
    const t2 = makeMockThrow(120, 180);

    const clusters = groupThrowsByLanding([t0, t1, t2]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.indices).toEqual([0, 1, 2]);
    expect(clusters[0]?.countLabel).toBe('3');
    expect(clusters[0]?.landing).toEqual({ x: 100, y: 200, z: 0 });
  });

  it('separates throws outside the cluster threshold into distinct clusters', () => {
    const t0 = makeMockThrow(100, 100);
    const t1 = makeMockThrow(120, 110); // close to t0
    const t2 = makeMockThrow(500, 500); // distant: (400^2 + 400^2) >> 150^2
    const t3 = makeMockThrow(510, 505); // close to t2

    const clusters = groupThrowsByLanding([t0, t1, t2, t3]);

    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.indices).toEqual([0, 1]);
    expect(clusters[0]?.countLabel).toBe('2');
    expect(clusters[1]?.indices).toEqual([2, 3]);
    expect(clusters[1]?.countLabel).toBe('2');
  });

  it('uses first throw landing as cluster representative', () => {
    const thresholdDist = Math.sqrt(CLUSTER_THRESHOLD_SQ); // 150
    const t0 = makeMockThrow(0, 0);
    const t1 = makeMockThrow(100, 0); // 100 units from t0 (< 150)
    // t2 is 100 units from t1 (at x=200), so 200 units from t0 (> 150)
    const t2 = makeMockThrow(200, 0);

    const clusters = groupThrowsByLanding([t0, t1, t2]);
    // t0 and t1 group together; t2 is > 150 from t0, so it starts a new cluster
    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.indices).toEqual([0, 1]);
    expect(clusters[1]?.indices).toEqual([2]);
    expect(thresholdDist).toBe(150);
  });
});

describe('findNearestCluster', () => {
  it('returns null when no clusters exist', () => {
    const plot = new Float32Array(0);
    const hit = findNearestCluster({ x: 100, y: 100 }, [], plot, 1, 16);
    expect(hit).toBeNull();
  });

  it('finds cluster when clicking near landing point', () => {
    const t0 = makeMockThrow(0, 0);
    const clusters = groupThrowsByLanding([t0]);

    // plot has stride 6: [ox, oy, oAlpha, lx, ly, lAlpha]
    const plot = new Float32Array([10, 10, 1, 200, 300, 1]);

    // Click at (205, 302) on scale 1 -> dist = Math.hypot(5, 2) ~ 5.38px <= 16px
    const hit = findNearestCluster({ x: 205, y: 302 }, clusters, plot, 1, 16);
    expect(hit).toBe(clusters[0]);
  });

  it('finds cluster when clicking near count badge for clusters with >= 2 throws', () => {
    const t0 = makeMockThrow(0, 0);
    const t1 = makeMockThrow(10, 10);
    const clusters = groupThrowsByLanding([t0, t1]);

    // plot for 2 throws: 12 elements
    const plot = new Float32Array([10, 10, 1, 200, 300, 1, 12, 12, 1, 205, 305, 1]);

    // Badge is at (lx * scale + 10, ly * scale + 10) = (210, 310)
    // Click at (212, 311) -> dist to badge is Math.hypot(2, 1) ~ 2.23px <= 16px
    const hit = findNearestCluster({ x: 212, y: 311 }, clusters, plot, 1, 16);
    expect(hit).toBe(clusters[0]);
  });

  it('returns null when click is farther than maxDistPx', () => {
    const t0 = makeMockThrow(0, 0);
    const clusters = groupThrowsByLanding([t0]);
    const plot = new Float32Array([10, 10, 1, 200, 300, 1]);

    // Click far away at (500, 500)
    const hit = findNearestCluster({ x: 500, y: 500 }, clusters, plot, 1, 16);
    expect(hit).toBeNull();
  });
});
