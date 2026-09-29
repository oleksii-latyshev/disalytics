import type { Lineup } from '@disa/demo-core';
import { getMapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import {
  findNearestLineup,
  findNearestLineupTarget,
  findNearestNode,
  groupLineupsByLanding,
  groupLineupsByOrigin,
  LINEUP_STRIDE,
  lineupPlot,
} from '../helpers/lineup-plot';

const MOCK_LINEUPS: readonly Lineup[] = [
  {
    id: 'mirage-smoke-1',
    title: 'A Site Stairs Smoke',
    map: 'de_mirage',
    side: 'T',
    kind: 'smoke',
    origin: { x: -200, y: -700, z: -160 },
    landing: { x: -1050, y: -300, z: -160 },
    pitch: -48,
    yaw: 155,
    throwType: 'stand',
    movementKeys: ['Stand'],
    movementKeysSummary: 'Stand',
    command: 'setpos -200 -700 -160; setang -48 155 0',
    createdAt: 1000,
  },
  {
    id: 'mirage-flash-1',
    title: 'Top Mid Flash',
    map: 'de_mirage',
    side: 'CT',
    kind: 'flash',
    origin: { x: -600, y: -700, z: -100 },
    landing: { x: 200, y: -800, z: 50 },
    pitch: -55,
    yaw: 10,
    throwType: 'jump',
    movementKeys: ['Jump'],
    movementKeysSummary: 'Jump',
    command: 'setpos -600 -700 -100; setang -55 10 0',
    createdAt: 2000,
  },
];

describe('lineupPlot', () => {
  const overview = getMapOverview('de_mirage');
  if (overview === undefined) throw new Error('de_mirage overview missing');

  it('allocates a Float32Array with LINEUP_STRIDE per lineup', () => {
    const plot = lineupPlot(overview, MOCK_LINEUPS);
    expect(plot.length).toBe(MOCK_LINEUPS.length * LINEUP_STRIDE);
  });

  it('maps world coordinates to valid radar bounds', () => {
    const plot = lineupPlot(overview, MOCK_LINEUPS);

    for (let i = 0; i < MOCK_LINEUPS.length; i++) {
      const at = i * LINEUP_STRIDE;
      const ox = plot[at];
      const oy = plot[at + 1];
      const lx = plot[at + 2];
      const ly = plot[at + 3];

      expect(ox).toBeDefined();
      expect(oy).toBeDefined();
      expect(lx).toBeDefined();
      expect(ly).toBeDefined();

      expect(ox ?? 0).toBeGreaterThanOrEqual(0);
      expect(ox ?? 0).toBeLessThanOrEqual(1024);
      expect(oy ?? 0).toBeGreaterThanOrEqual(0);
      expect(oy ?? 0).toBeLessThanOrEqual(1024);

      expect(lx ?? 0).toBeGreaterThanOrEqual(0);
      expect(lx ?? 0).toBeLessThanOrEqual(1024);
      expect(ly ?? 0).toBeGreaterThanOrEqual(0);
      expect(ly ?? 0).toBeLessThanOrEqual(1024);
    }
  });
});

describe('findNearestLineup', () => {
  const overview = getMapOverview('de_mirage');
  if (overview === undefined) throw new Error('de_mirage overview missing');

  const plot = lineupPlot(overview, MOCK_LINEUPS);
  const scale = 0.5; // e.g. 512px canvas for 1024px overview

  it('returns index of closest lineup within hit radius of origin', () => {
    const ox = plot[0] ?? 0;
    const oy = plot[1] ?? 0;

    const hit = findNearestLineup({ x: ox + 5, y: oy - 5 }, plot, MOCK_LINEUPS.length, scale, 20);
    expect(hit).toBe(0);
  });

  it('returns index of closest lineup within hit radius of landing', () => {
    const lx = plot[LINEUP_STRIDE + 2] ?? 0;
    const ly = plot[LINEUP_STRIDE + 3] ?? 0;

    const hit = findNearestLineup({ x: lx + 2, y: ly + 3 }, plot, MOCK_LINEUPS.length, scale, 20);
    expect(hit).toBe(1);
  });

  it('returns null when click is far away from all points', () => {
    const hit = findNearestLineup({ x: 0, y: 0 }, plot, MOCK_LINEUPS.length, scale, 10);
    expect(hit).toBeNull();
  });
});

describe('groupLineupsByOrigin', () => {
  it('groups grenades sharing the same groupId for origin', () => {
    const first = MOCK_LINEUPS[0];
    const second = MOCK_LINEUPS[1];
    if (first === undefined || second === undefined) throw new Error('Missing test lineups');
    const grouped = groupLineupsByOrigin([
      { ...first, groupId: 'origin-grp-1', groupTarget: 'origin' },
      { ...first, id: 'second', groupId: 'origin-grp-1', groupTarget: 'origin' },
      second,
    ]);
    expect(grouped.map(({ indices }) => indices)).toEqual([[0, 1]]);
    expect(grouped[0]?.countLabel).toBe('2');
  });

  it('does not group lineups without groupId', () => {
    const first = MOCK_LINEUPS[0];
    if (first === undefined) throw new Error('Missing test lineup');
    const grouped = groupLineupsByOrigin([
      first,
      { ...first, id: 'second', origin: { x: -200, y: -700, z: -160 } },
    ]);
    expect(grouped).toEqual([]);
  });
});

describe('groupLineupsByLanding', () => {
  it('groups grenades sharing the same groupId for landing', () => {
    const first = MOCK_LINEUPS[0];
    const second = MOCK_LINEUPS[1];
    if (first === undefined || second === undefined) throw new Error('Missing test lineups');
    const grouped = groupLineupsByLanding([
      { ...first, groupId: 'landing-grp-1', groupTarget: 'landing' },
      { ...second, id: 'third', groupId: 'landing-grp-1', groupTarget: 'landing' },
      second,
    ]);
    expect(grouped.map(({ indices }) => indices)).toEqual([[0, 1]]);
    expect(grouped[0]?.countLabel).toBe('2');
  });

  it('does not group lineups by proximity alone without groupId', () => {
    const first = MOCK_LINEUPS[0];
    if (first === undefined) throw new Error('Missing test lineup');
    const grouped = groupLineupsByLanding([
      first,
      { ...first, id: 'smoke-alternate-spawn', landing: { x: -970, y: -220, z: -160 } },
    ]);
    expect(grouped).toEqual([]);
  });
});

describe('findNearestLineupTarget', () => {
  const overview = getMapOverview('de_mirage');
  if (overview === undefined) throw new Error('de_mirage overview missing');
  const plot = lineupPlot(overview, MOCK_LINEUPS);
  const scale = 0.5;

  it('distinguishes origin vs landing targets', () => {
    const ox = plot[0] ?? 0;
    const oy = plot[1] ?? 0;
    const hitOrigin = findNearestLineupTarget(
      { x: ox + 2, y: oy + 2 },
      plot,
      MOCK_LINEUPS.length,
      scale,
      20,
    );
    expect(hitOrigin).toEqual({ index: 0, target: 'origin' });

    const lx = plot[LINEUP_STRIDE + 2] ?? 0;
    const ly = plot[LINEUP_STRIDE + 3] ?? 0;
    const hitLanding = findNearestLineupTarget(
      { x: lx + 2, y: ly + 2 },
      plot,
      MOCK_LINEUPS.length,
      scale,
      20,
    );
    expect(hitLanding).toEqual({ index: 1, target: 'landing' });
  });
});

describe('findNearestNode', () => {
  const overview = getMapOverview('de_mirage');
  if (overview === undefined) throw new Error('de_mirage overview missing');

  const first = MOCK_LINEUPS[0];
  const second = MOCK_LINEUPS[1];
  if (first === undefined || second === undefined) throw new Error('Missing test lineups');

  const lineupsWithBounces: readonly Lineup[] = [
    {
      ...first,
      waypoints: [{ x: -500, y: -500, z: -160 }],
    },
    second,
  ];
  const plot = lineupPlot(overview, lineupsWithBounces);
  const scale = 0.5;

  it('finds origin node', () => {
    const ox = plot[0] ?? 0;
    const oy = plot[1] ?? 0;
    const node = findNearestNode(
      { x: ox + 2, y: oy + 2 },
      plot,
      lineupsWithBounces,
      overview,
      scale,
      20,
    );
    expect(node).toEqual({ lineupIndex: 0, target: 'origin' });
  });

  it('finds landing node', () => {
    const lx = plot[2] ?? 0;
    const ly = plot[3] ?? 0;
    const node = findNearestNode(
      { x: lx + 2, y: ly + 2 },
      plot,
      lineupsWithBounces,
      overview,
      scale,
      20,
    );
    expect(node).toEqual({ lineupIndex: 0, target: 'landing' });
  });

  it('finds waypoint node', () => {
    // waypoint x: -500, y: -500 in world coords
    const wx = (-500 - overview.posX) / overview.scale;
    const wy = (overview.posY - -500) / overview.scale;
    const node = findNearestNode(
      { x: wx + 2, y: wy + 2 },
      plot,
      lineupsWithBounces,
      overview,
      scale,
      20,
    );
    expect(node).toEqual({ lineupIndex: 0, target: 'waypoint', waypointIndex: 0 });
  });

  it('returns null when no node is within range', () => {
    const node = findNearestNode({ x: 0, y: 0 }, plot, lineupsWithBounces, overview, scale, 5);
    expect(node).toBeNull();
  });
});
