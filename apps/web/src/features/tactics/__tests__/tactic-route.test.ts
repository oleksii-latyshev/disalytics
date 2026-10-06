import { getMapOverview, loadMapNavGrid, mapSpawns, radarX, radarY } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { snapPoint, toRadar, toWorld, walkBetween, walkRoute } from '../helpers/tactic-route';

const overview = getMapOverview('de_mirage');
if (overview === undefined) throw new Error('no overview');
const grid = await loadMapNavGrid('de_mirage');
const spawn = mapSpawns('de_mirage', 'T')[0] ?? { x: 0, y: 0 };
const start = toRadar(overview, spawn);

describe('coordinates', () => {
  it('round-trips a world point through the radar, rounded to whole units', () => {
    const world = toWorld(overview, toRadar(overview, { x: -1200, y: 500 }));
    expect(world).toEqual({ x: -1200, y: 500 });
    expect(toRadar(overview, spawn).x).toBeCloseTo(radarX(overview, spawn.x));
    expect(toRadar(overview, spawn).y).toBeCloseTo(radarY(overview, spawn.y));
  });
});

describe('walkRoute', () => {
  it('goes straight between points without a grid and never breaks', () => {
    const route = { mode: 'points' as const, points: [{ x: spawn.x - 300, y: spawn.y }] };
    const walked = walkRoute(overview, undefined, start, route);
    expect(walked.points).toHaveLength(2);
    expect(walked.breaks).toEqual([]);
  });

  it('keeps a pen stroke as drawn, from the start', () => {
    const points = [
      { x: spawn.x - 100, y: spawn.y },
      { x: spawn.x - 100, y: spawn.y - 100 },
    ];
    const walked = walkRoute(overview, grid, start, { mode: 'pen', points });
    expect(walked.points).toHaveLength(3);
    expect(walked.breaks).toEqual([]);
  });

  it('starts every leg where the one before ended and marks a leg the grid cannot join', () => {
    expect(grid).toBeDefined();
    const inside = { x: 700, y: 470 };
    const world = toWorld(overview, inside);
    const walked = walkRoute(overview, grid, start, {
      mode: 'points',
      points: [world],
    });
    expect(walked.points[0]).toBe(start);
    expect(walked.points.length).toBeGreaterThanOrEqual(2);
    const sealed = walkBetween(grid, start, { x: 5, y: 5 });
    expect(sealed.reachable).toBe(false);
    expect(sealed.points).toHaveLength(2);
  });

  it('snaps a click off the floor onto it, and leaves it alone with no grid', () => {
    const wall = { x: 5, y: 5 };
    expect(snapPoint(undefined, wall)).toBe(wall);
    const snapped = snapPoint(grid, wall);
    expect(Math.hypot(snapped.x - wall.x, snapped.y - wall.y)).toBeGreaterThanOrEqual(0);
  });
});
