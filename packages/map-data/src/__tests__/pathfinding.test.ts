import { beforeAll, describe, expect, it } from 'vitest';
import { MAP_OVERVIEWS } from '../generated/overviews';
import { loadMapNavGrid } from '../navgrid';
import { findNavPath, findPlatePath, findWorldPath, snapToWalkable } from '../pathfinding';
import { mapSpawns } from '../spawns';
import { radarX, radarY } from '../transform';
import type { NavGrid, NavLevel, RadarPoint } from '../types';

function levelFrom(rows: readonly string[], cell = 8): NavLevel {
  const size = rows.length;
  const walkable = new Uint8Array(size * size);
  for (const [y, row] of rows.entries()) {
    for (let x = 0; x < size; x++) walkable[y * size + x] = row[x] === '.' ? 1 : 0;
  }
  return { cell, size, walkable };
}

function blockedAlong(level: NavLevel, a: RadarPoint, b: RadarPoint): number {
  let blocked = 0;
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (level.cell / 16));
  for (let i = 0; i <= steps; i++) {
    const x = Math.floor((a.x + ((b.x - a.x) * i) / steps) / level.cell);
    const y = Math.floor((a.y + ((b.y - a.y) * i) / steps) / level.cell);
    if (level.walkable[y * level.size + x] !== 1) blocked++;
  }
  return blocked;
}

function crossings(level: NavLevel, points: readonly RadarPoint[]): number {
  let blocked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a !== undefined && b !== undefined) blocked += blockedAlong(level, a, b);
  }
  return blocked;
}

const at = (cx: number, cy: number): RadarPoint => ({ x: cx * 8 + 4, y: cy * 8 + 4 });

describe('findNavPath on a small grid', () => {
  const level = levelFrom([
    '..........',
    '..........',
    '..######..',
    '..######..',
    '..######..',
    '..........',
    '..........',
    '######.###',
    '######.###',
    '..........',
  ]);

  it('goes straight where nothing is in the way', () => {
    const path = findNavPath(level, at(0, 0), at(9, 1));
    expect(path.reachable).toBe(true);
    expect(path.points).toHaveLength(2);
  });

  it('bends around a block and never crosses a blocked cell', () => {
    const path = findNavPath(level, at(4, 1), at(4, 6));
    expect(path.reachable).toBe(true);
    expect(path.points.length).toBeGreaterThan(2);
    expect(crossings(level, path.points)).toBe(0);
  });

  it('threads a one-cell doorway', () => {
    const path = findNavPath(level, at(0, 6), at(9, 9));
    expect(path.reachable).toBe(true);
    expect(crossings(level, path.points)).toBe(0);
  });

  it('does not cut a corner between two blocked cells', () => {
    const diagonal = levelFrom(['.#', '#.']);
    const path = findNavPath(diagonal, at(0, 0), at(1, 1));
    expect(path.reachable).toBe(false);
  });

  it('gives a straight, flagged segment when the ends share no ground', () => {
    const split = levelFrom(['..#..', '..#..', '..#..', '..#..', '..#..']);
    const path = findNavPath(split, at(0, 0), at(4, 4));
    expect(path.reachable).toBe(false);
    expect(path.points).toHaveLength(2);
  });

  it('returns the memoised path for the same ends', () => {
    expect(findNavPath(level, at(4, 1), at(4, 6))).toBe(findNavPath(level, at(4, 1), at(4, 6)));
  });
});

describe('snapToWalkable', () => {
  const level = levelFrom(['....', '.##.', '.##.', '....']);

  it('leaves a point on the floor where it is', () => {
    const point = { x: 3, y: 3 };
    expect(snapToWalkable(level, point)).toBe(point);
  });

  it('moves a point in a wall to the centre of the nearest walkable cell', () => {
    expect(snapToWalkable(level, { x: 13, y: 12 })).toEqual({ x: 12, y: 4 });
  });

  it('pulls a point off the image back onto it', () => {
    expect(snapToWalkable(level, { x: -50, y: -50 })).toEqual({ x: 4, y: 4 });
  });

  it('gives up when no floor is near', () => {
    const empty = levelFrom(['####', '####', '####', '####']);
    expect(snapToWalkable(empty, { x: 10, y: 10 })).toBeUndefined();
  });
});

describe('Mirage', () => {
  const overview = MAP_OVERVIEWS.de_mirage;
  let grid: NavGrid;

  beforeAll(async () => {
    const loaded = await loadMapNavGrid('de_mirage');
    if (loaded === undefined) throw new Error('no Mirage grid');
    grid = loaded;
  });

  it('routes T spawn to Palace around the walls, bending at corners', () => {
    const spawn = mapSpawns('de_mirage', 'T')[0];
    if (spawn === undefined) throw new Error('no T spawn');
    const level = grid.levels[0];
    if (level === undefined) throw new Error('no level');

    const from = { x: radarX(overview, spawn.x), y: radarY(overview, spawn.y) };
    const to = { x: radarX(overview, 100), y: radarY(overview, -1600) };
    const path = findNavPath(level, from, to);

    expect(path.reachable).toBe(true);
    expect(path.points.length).toBeGreaterThan(2);
    expect(crossings(level, path.points)).toBe(0);

    const last = path.points[path.points.length - 1];
    if (last === undefined) throw new Error('empty path');
    const straight = Math.hypot(to.x - from.x, to.y - from.y);
    const walked = path.points.reduce(
      (sum, p, i) =>
        i === 0
          ? 0
          : sum +
            Math.hypot(p.x - (path.points[i - 1]?.x ?? 0), p.y - (path.points[i - 1]?.y ?? 0)),
      0,
    );
    expect(walked).toBeGreaterThan(straight * 1.05);
  });

  it('keeps world and plate routes in step with the radar one', () => {
    const spawn = mapSpawns('de_mirage', 'T')[0];
    if (spawn === undefined) throw new Error('no T spawn');

    const world = findWorldPath(overview, grid, spawn, spawn.z, { x: 100, y: -1600 }, 0);
    expect(world.reachable).toBe(true);
    expect(world.points[0]?.x).toBeCloseTo(spawn.x, 3);

    const plate = findPlatePath(
      overview,
      grid,
      { x: radarX(overview, spawn.x), y: radarY(overview, spawn.y) },
      { x: radarX(overview, 100), y: radarY(overview, -1600) },
    );
    expect(plate.reachable).toBe(true);
    expect(plate.points).toHaveLength(world.points.length);
  });
});

describe('Nuke', () => {
  it('treats two floors as unconnected', async () => {
    const grid = await loadMapNavGrid('de_nuke');
    expect(grid?.levels).toHaveLength(2);
    if (grid === undefined) return;

    const overview = MAP_OVERVIEWS.de_nuke;
    const path = findWorldPath(overview, grid, { x: 0, y: -900 }, 0, { x: 0, y: -900 }, -700);
    expect(path.reachable).toBe(false);
  });
});

describe('loadMapNavGrid', () => {
  it('answers nothing for a map outside the pool', async () => {
    expect(await loadMapNavGrid('workshop_custom_map')).toBeUndefined();
  });

  it('holds one grid per level of every map, with floor in each', async () => {
    for (const overview of Object.values(MAP_OVERVIEWS)) {
      const id = overview.id;
      const grid = await loadMapNavGrid(id);
      expect(grid?.levels).toHaveLength(overview.levels.length);
      for (const level of grid?.levels ?? []) {
        expect(level.walkable.reduce((a, b) => a + b, 0)).toBeGreaterThan(1000);
      }
    }
  });
});
