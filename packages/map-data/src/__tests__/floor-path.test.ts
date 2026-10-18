import { describe, expect, it } from 'vitest';
import { CONNECTOR_COST_PX, findFloorPath } from '../floor-path';
import { loadMapNavGrid } from '../navgrid';
import { findNavPath } from '../pathfinding';
import type { FloorPoint, NavConnector, NavGrid, NavLevel } from '../types';

const SIZE = 16;
const CELL = 8;

function open(): NavLevel {
  return { cell: CELL, size: SIZE, walkable: new Uint8Array(SIZE * SIZE).fill(1) };
}

function spot(floor: number, cx: number, cy: number): FloorPoint {
  return { floor, x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}

function gridWith(connectors: readonly NavConnector[], floors = 2): NavGrid {
  return { map: 'test', levels: Array.from({ length: floors }, open), connectors };
}

function length(points: readonly FloorPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a !== undefined && b !== undefined) total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

describe('findFloorPath', () => {
  const stairs: NavConnector = { a: spot(0, 8, 8), b: spot(1, 8, 8) };

  it('joins two floors through a connector, each point carrying its floor', () => {
    const path = findFloorPath(gridWith([stairs]), spot(0, 1, 1), spot(1, 14, 14));
    expect(path.reachable).toBe(true);
    expect(path.points[0]?.floor).toBe(0);
    expect(path.points[path.points.length - 1]?.floor).toBe(1);

    const change = path.points.findIndex(
      (point, i) => i > 0 && point.floor !== path.points[i - 1]?.floor,
    );
    expect(change).toBeGreaterThan(0);
    expect(path.points[change - 1]).toMatchObject({ floor: 0, x: stairs.a.x, y: stairs.a.y });
    expect(path.points[change]).toMatchObject({ floor: 1, x: stairs.b.x, y: stairs.b.y });
  });

  it('has no way between floors without a connector', () => {
    const path = findFloorPath(gridWith([]), spot(0, 1, 1), spot(1, 14, 14));
    expect(path.reachable).toBe(false);
    expect(path.points).toHaveLength(2);
  });

  it('uses a one-way connector in its direction only', () => {
    const drop: NavConnector = { ...stairs, isOneWay: true };
    const grid = gridWith([drop]);
    expect(findFloorPath(grid, spot(0, 1, 1), spot(1, 14, 14)).reachable).toBe(true);
    expect(findFloorPath(grid, spot(1, 14, 14), spot(0, 1, 1)).reachable).toBe(false);
  });

  it('picks the connector that makes the whole walk shortest', () => {
    const near: NavConnector = { a: spot(0, 1, 1), b: spot(1, 1, 1) };
    const far: NavConnector = { a: spot(0, 14, 14), b: spot(1, 14, 14) };
    const path = findFloorPath(gridWith([far, near]), spot(0, 2, 2), spot(1, 3, 3));
    expect(path.points.some((point) => point.x === near.a.x && point.floor === 0)).toBe(true);
    expect(path.points.some((point) => point.x === far.a.x)).toBe(false);
  });

  it('leaves a same-floor walk exactly as findNavPath has it when no connector shortens it', () => {
    const grid = gridWith([stairs]);
    const level = grid.levels[0];
    if (level === undefined) throw new Error('no level');
    const from = spot(0, 1, 1);
    const to = spot(0, 14, 2);
    const direct = findNavPath(level, from, to);
    const path = findFloorPath(grid, from, to);
    expect(path.reachable).toBe(true);
    expect(path.points.map(({ x, y }) => ({ x, y }))).toEqual(
      direct.points.map(({ x, y }) => ({ x, y })),
    );
    expect(path.points.every((point) => point.floor === 0)).toBe(true);
  });

  it('prefers a connector hop over a long way round on one floor', () => {
    const wall = open();
    for (let y = 0; y < SIZE - 1; y++) wall.walkable[y * SIZE + 8] = 0;
    const hop: NavConnector = { a: spot(0, 7, 8), b: spot(1, 7, 8) };
    const back: NavConnector = { a: spot(1, 9, 8), b: spot(0, 9, 8) };
    const grid: NavGrid = { map: 'test', levels: [wall, open()], connectors: [hop, back] };

    const path = findFloorPath(grid, spot(0, 2, 2), spot(0, 14, 2));
    const around = findNavPath(wall, spot(0, 2, 2), spot(0, 14, 2));
    expect(path.reachable).toBe(true);
    expect(path.points.some((point) => point.floor === 1)).toBe(true);
    expect(length(path.points) + 2 * CONNECTOR_COST_PX).toBeLessThan(
      length(around.points.map((point) => ({ ...point, floor: 0 }))),
    );
  });

  it('is unreachable when an end has no ground', () => {
    const blocked: NavGrid = {
      map: 'test',
      levels: [open(), { cell: CELL, size: SIZE, walkable: new Uint8Array(SIZE * SIZE) }],
      connectors: [stairs],
    };
    expect(findFloorPath(blocked, spot(0, 1, 1), spot(1, 4, 4)).reachable).toBe(false);
  });

  it('answers a floor the grid does not have with a straight, unreachable segment', () => {
    expect(findFloorPath(gridWith([stairs]), spot(0, 1, 1), spot(7, 4, 4)).reachable).toBe(false);
  });
});

describe('real connectors', () => {
  it('Nuke: a route across floors passes a connector read off the demos', async () => {
    const grid = await loadMapNavGrid('de_nuke');
    if (grid === undefined) throw new Error('no Nuke grid');
    const path = findFloorPath(grid, { floor: 0, x: 600, y: 330 }, { floor: 1, x: 700, y: 760 });
    expect(path.reachable).toBe(true);
    const crossing = path.points.find(
      (point, i) => i > 0 && point.floor !== path.points[i - 1]?.floor,
    );
    expect(crossing).toBeDefined();
  });

  it('Mirage: the underpass is its own floor, reachable from the main floor by stairs', async () => {
    const grid = await loadMapNavGrid('de_mirage');
    if (grid === undefined) throw new Error('no Mirage grid');
    expect(grid.levels).toHaveLength(2);

    const from = { floor: 1, x: 450, y: 350 };
    const path = findFloorPath(grid, from, { floor: 0, x: 700, y: 600 });
    expect(path.reachable).toBe(true);
    expect(path.points.some((point) => point.floor === 1)).toBe(true);
    expect(path.points.some((point) => point.floor === 0)).toBe(true);
  });

  it('Mirage: a main-floor walk keeps to the main floor when no connector shortens it', async () => {
    const grid = await loadMapNavGrid('de_mirage');
    if (grid === undefined) throw new Error('no Mirage grid');
    const path = findFloorPath(grid, { floor: 0, x: 700, y: 600 }, { floor: 0, x: 300, y: 600 });
    expect(path.reachable).toBe(true);
    expect(path.points.every((point) => point.floor === 0)).toBe(true);
  });
});
