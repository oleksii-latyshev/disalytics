import { plateLayout, plateLevelIndex, plateToRadar } from './layout';
import { radarToWorld, radarX, radarY } from './transform';
import type { MapOverview, NavGrid, NavLevel, NavPath, RadarPoint, WorldPlanePoint } from './types';

/** How far, in cells, a point off the floor is pulled to the nearest walkable cell before giving up. */
const MAX_SNAP_CELLS = 32;
/** Memoised routes kept per level; the oldest goes first. */
const MAX_CACHED_PATHS = 256;
const DIAGONAL = Math.SQRT2;

const NEIGHBOURS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, DIAGONAL],
  [1, -1, DIAGONAL],
  [-1, 1, DIAGONAL],
  [-1, -1, DIAGONAL],
] as const;

interface Scratch {
  cost: Float32Array;
  from: Int32Array;
  /** `visited[i] === generation` means closed in the current search, so nothing is cleared between searches. */
  visited: Uint32Array;
  generation: number;
  heapKeys: Float32Array;
  heapNodes: Int32Array;
  heapSize: number;
  cache: Map<string, NavPath>;
}

const SCRATCH = new WeakMap<NavLevel, Scratch>();

function scratchFor(level: NavLevel): Scratch {
  let scratch = SCRATCH.get(level);
  if (scratch === undefined) {
    const cells = level.size * level.size;
    scratch = {
      cost: new Float32Array(cells),
      from: new Int32Array(cells),
      visited: new Uint32Array(cells),
      generation: 0,
      heapKeys: new Float32Array(1024),
      heapNodes: new Int32Array(1024),
      heapSize: 0,
      cache: new Map(),
    };
    SCRATCH.set(level, scratch);
  }
  return scratch;
}

function isWalkable(level: NavLevel, cx: number, cy: number): boolean {
  return (
    cx >= 0 &&
    cy >= 0 &&
    cx < level.size &&
    cy < level.size &&
    level.walkable[cy * level.size + cx] === 1
  );
}

function push(scratch: Scratch, key: number, node: number): void {
  if (scratch.heapSize === scratch.heapKeys.length) {
    const keys = new Float32Array(scratch.heapSize * 2);
    const nodes = new Int32Array(scratch.heapSize * 2);
    keys.set(scratch.heapKeys);
    nodes.set(scratch.heapNodes);
    scratch.heapKeys = keys;
    scratch.heapNodes = nodes;
  }

  const { heapKeys, heapNodes } = scratch;
  let child = scratch.heapSize++;
  while (child > 0) {
    const parent = (child - 1) >> 1;
    if ((heapKeys[parent] ?? 0) <= key) break;
    heapKeys[child] = heapKeys[parent] ?? 0;
    heapNodes[child] = heapNodes[parent] ?? 0;
    child = parent;
  }
  heapKeys[child] = key;
  heapNodes[child] = node;
}

function siftDown(scratch: Scratch, key: number, node: number): void {
  const { heapKeys, heapNodes } = scratch;
  const size = scratch.heapSize;
  let parent = 0;

  for (;;) {
    let child = parent * 2 + 1;
    if (child >= size) break;
    if (child + 1 < size && (heapKeys[child + 1] ?? 0) < (heapKeys[child] ?? 0)) child++;
    if ((heapKeys[child] ?? 0) >= key) break;
    heapKeys[parent] = heapKeys[child] ?? 0;
    heapNodes[parent] = heapNodes[child] ?? 0;
    parent = child;
  }
  heapKeys[parent] = key;
  heapNodes[parent] = node;
}

function pop(scratch: Scratch): number {
  const top = scratch.heapNodes[0] ?? 0;
  const last = --scratch.heapSize;
  siftDown(scratch, scratch.heapKeys[last] ?? 0, scratch.heapNodes[last] ?? 0);
  return top;
}

interface Nearest {
  x: number;
  y: number;
  distance: number;
}

function consider(level: NavLevel, found: Nearest, cx: number, cy: number, fx: number, fy: number) {
  if (!isWalkable(level, cx, cy)) return;

  const distance = (cx + 0.5 - fx) ** 2 + (cy + 0.5 - fy) ** 2;
  if (distance < found.distance) {
    found.x = cx;
    found.y = cy;
    found.distance = distance;
  }
}

/** The cells exactly `ring` steps (Chebyshev) from the centre cell, nearest to `(fx, fy)` into `found`. */
function scanRing(
  level: NavLevel,
  found: Nearest,
  cx: number,
  cy: number,
  ring: number,
  fx: number,
  fy: number,
) {
  for (let dy = -ring; dy <= ring; dy++) {
    const step = Math.abs(dy) === ring ? 1 : ring * 2;
    for (let dx = -ring; dx <= ring; dx += step) consider(level, found, cx + dx, cy + dy, fx, fy);
  }
}

/**
 * The walkable cell nearest to a point, as its centre in radar pixels — or the point itself when
 * it already stands on one. `undefined` when nothing walkable lies within `MAX_SNAP_CELLS`.
 */
export function snapToWalkable(level: NavLevel, point: RadarPoint): RadarPoint | undefined {
  const fx = point.x / level.cell;
  const fy = point.y / level.cell;
  const inside = fx >= 0 && fy >= 0 && fx < level.size && fy < level.size;
  const cx = Math.min(level.size - 1, Math.max(0, Math.floor(fx)));
  const cy = Math.min(level.size - 1, Math.max(0, Math.floor(fy)));

  if (inside && isWalkable(level, cx, cy)) return point;

  const found: Nearest = { x: -1, y: -1, distance: Number.POSITIVE_INFINITY };
  consider(level, found, cx, cy, fx, fy);

  for (let ring = 1; ring <= MAX_SNAP_CELLS && (ring - 1) * (ring - 1) <= found.distance; ring++) {
    scanRing(level, found, cx, cy, ring, fx, fy);
  }

  if (found.x < 0) return undefined;
  return { x: (found.x + 0.5) * level.cell, y: (found.y + 0.5) * level.cell };
}

/** Ray parameter spent per cell along an axis; a ray that never moves along it never crosses. */
function rayStep(direction: number): number {
  return direction === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / direction);
}

/** A diagonal step that passes between two blocked cells. */
function squeezes(level: NavLevel, cx: number, cy: number, stepX: number, stepY: number): boolean {
  return !isWalkable(level, cx + stepX, cy) || !isWalkable(level, cx, cy + stepY);
}

/** Where a ray first leaves the cell it starts in along one axis, as a parameter along the ray. */
function firstCrossing(origin: number, cell: number, direction: number, delta: number): number {
  if (direction === 0) return Number.POSITIVE_INFINITY;
  return (direction > 0 ? cell + 1 - origin : origin - cell) * delta;
}

/**
 * Whether the straight segment between two points, in cell units, touches only walkable cells.
 * Every cell the line crosses is visited, and a line through a cell corner needs both cells on
 * either side of it, so a diagonal cannot squeeze between two blocked cells.
 */
function hasLineOfSight(level: NavLevel, ax: number, ay: number, bx: number, by: number): boolean {
  let cx = Math.floor(ax);
  let cy = Math.floor(ay);
  const endX = Math.floor(bx);
  const endY = Math.floor(by);
  const stepX = bx > ax ? 1 : -1;
  const stepY = by > ay ? 1 : -1;
  const deltaX = rayStep(bx - ax);
  const deltaY = rayStep(by - ay);
  let maxX = firstCrossing(ax, cx, bx - ax, deltaX);
  let maxY = firstCrossing(ay, cy, by - ay, deltaY);

  while (isWalkable(level, cx, cy)) {
    if (cx === endX && cy === endY) return true;

    if (maxX === maxY) {
      if (squeezes(level, cx, cy, stepX, stepY)) return false;
      cx += stepX;
      cy += stepY;
      maxX += deltaX;
      maxY += deltaY;
    } else if (maxX < maxY) {
      cx += stepX;
      maxX += deltaX;
    } else {
      cy += stepY;
      maxY += deltaY;
    }
  }

  return false;
}

/** Octile distance — exact on an open grid, so the search never expands more than it must. */
function octile(size: number, node: number, target: number): number {
  const x = node % size;
  const tx = target % size;
  const dx = Math.abs(x - tx);
  const dy = Math.abs((node - x) / size - (target - tx) / size);
  return Math.max(dx, dy) + (DIAGONAL - 1) * Math.min(dx, dy);
}

/** Relax every legal step out of `node`; a diagonal needs both orthogonal cells open. */
function expand(level: NavLevel, scratch: Scratch, node: number, target: number): void {
  const { size } = level;
  const x = node % size;
  const y = (node - x) / size;

  for (const [dx, dy, step] of NEIGHBOURS) {
    const nx = x + dx;
    const ny = y + dy;
    const open = isWalkable(level, nx, ny);
    const cuts = dx !== 0 && dy !== 0 && (!isWalkable(level, nx, y) || !isWalkable(level, x, ny));
    if (!open || cuts) continue;

    const next = ny * size + nx;
    const total = (scratch.cost[node] ?? 0) + step;
    if (total < (scratch.cost[next] ?? Number.POSITIVE_INFINITY)) {
      scratch.cost[next] = total;
      scratch.from[next] = node;
      push(scratch, total + octile(size, next, target), next);
    }
  }
}

/** Cell indices from start to target, or `undefined` when no walkable chain joins them. */
function searchCells(
  level: NavLevel,
  scratch: Scratch,
  start: number,
  target: number,
): number[] | undefined {
  const generation = ++scratch.generation;

  scratch.heapSize = 0;
  scratch.cost.fill(Number.POSITIVE_INFINITY);
  scratch.from[start] = -1;
  scratch.cost[start] = 0;
  push(scratch, octile(level.size, start, target), start);

  while (scratch.heapSize > 0) {
    const node = pop(scratch);
    if (node === target) break;
    if (scratch.visited[node] === generation) continue;
    scratch.visited[node] = generation;
    expand(level, scratch, node, target);
  }

  if (scratch.cost[target] === Number.POSITIVE_INFINITY) return undefined;

  const cells: number[] = [];
  for (let node = target; node !== -1; node = scratch.from[node] ?? -1) cells.push(node);
  return cells.reverse();
}

/** Drops every waypoint the one before it can already see past — the route then hugs corners. */
function pull(level: NavLevel, chain: readonly RadarPoint[]): RadarPoint[] {
  const { cell } = level;
  const out: RadarPoint[] = [];
  const first = chain[0];
  if (first === undefined) return out;
  out.push(first);

  let anchor = 0;
  while (anchor < chain.length - 1) {
    const from = chain[anchor];
    let reach = chain.length - 1;
    while (reach > anchor + 1) {
      const to = chain[reach];
      if (
        from !== undefined &&
        to !== undefined &&
        hasLineOfSight(level, from.x / cell, from.y / cell, to.x / cell, to.y / cell)
      ) {
        break;
      }
      reach--;
    }
    const next = chain[reach];
    if (next !== undefined) out.push(next);
    anchor = reach;
  }

  return out;
}

function straight(from: RadarPoint, to: RadarPoint): NavPath {
  return { points: [from, to], reachable: false };
}

/**
 * A corner-hugging route between two radar-pixel points on one level: both ends are snapped to
 * walkable ground, A* runs over the 8-connected cells without cutting a blocked corner, and the
 * cell chain is string-pulled by line of sight. Two ends with no walkable ground between them
 * come back as a straight segment with `reachable: false`. The result is memoised and shared —
 * do not mutate it.
 */
export function findNavPath(level: NavLevel, from: RadarPoint, to: RadarPoint): NavPath {
  const start = snapToWalkable(level, from);
  const end = snapToWalkable(level, to);
  if (start === undefined || end === undefined) return straight(from, to);

  const scratch = scratchFor(level);
  const key = `${start.x},${start.y}>${end.x},${end.y}`;
  const cached = scratch.cache.get(key);
  if (cached !== undefined) return cached;

  const { cell, size } = level;
  const startCell = Math.floor(start.y / cell) * size + Math.floor(start.x / cell);
  const endCell = Math.floor(end.y / cell) * size + Math.floor(end.x / cell);
  const cells = searchCells(level, scratch, startCell, endCell);

  let result: NavPath;
  if (cells === undefined) {
    result = straight(start, end);
  } else {
    const chain: RadarPoint[] = [start];
    for (const index of cells) {
      const x = index % size;
      chain.push({ x: (x + 0.5) * cell, y: ((index - x) / size + 0.5) * cell });
    }
    chain.push(end);
    result = { points: pull(level, chain), reachable: true };
  }

  if (scratch.cache.size >= MAX_CACHED_PATHS) {
    const oldest = scratch.cache.keys().next();
    if (oldest.done !== true) scratch.cache.delete(oldest.value);
  }
  scratch.cache.set(key, result);
  return result;
}

/**
 * `findNavPath` over a map's plate: points in and out are plate pixels, so a Nuke route stays on
 * its own floor's slot. Two points on different floors have no walkable link in this grid and
 * give a straight, unreachable segment.
 */
export function findPlatePath(
  overview: MapOverview,
  grid: NavGrid,
  from: RadarPoint,
  to: RadarPoint,
): NavPath {
  const a = plateToRadar(overview, from.x, from.y);
  const b = plateToRadar(overview, to.x, to.y);
  const level = grid.levels[a.levelIndex];
  if (level === undefined || a.levelIndex !== b.levelIndex) return straight(from, to);

  const slot = plateLayout(overview).slots[a.levelIndex];
  if (slot === undefined) return straight(from, to);

  const path = findNavPath(level, { x: a.x, y: a.y }, { x: b.x, y: b.y });
  if (!path.reachable) return straight(from, to);

  return {
    reachable: true,
    points: path.points.map((point) => ({
      x: point.x - slot.cropX + slot.x,
      y: point.y - slot.cropY + slot.y,
    })),
  };
}

export interface NavWorldPath {
  readonly points: readonly WorldPlanePoint[];
  readonly reachable: boolean;
}

/**
 * `findNavPath` in world units. `fromZ` and `toZ` pick each end's floor (`plateLevelIndex`'s
 * rule); different floors give a straight, unreachable segment.
 */
export function findWorldPath(
  overview: MapOverview,
  grid: NavGrid,
  from: WorldPlanePoint,
  fromZ: number,
  to: WorldPlanePoint,
  toZ: number,
): NavWorldPath {
  const a = { x: radarX(overview, from.x), y: radarY(overview, from.y) };
  const b = { x: radarX(overview, to.x), y: radarY(overview, to.y) };
  const fromLevel = plateLevelIndex(overview, fromZ);
  const level = grid.levels[fromLevel];

  if (level === undefined || fromLevel !== plateLevelIndex(overview, toZ)) {
    return { points: [from, to], reachable: false };
  }

  const path = findNavPath(level, a, b);
  if (!path.reachable) return { points: [from, to], reachable: false };
  return { points: path.points.map((point) => radarToWorld(overview, point)), reachable: true };
}
