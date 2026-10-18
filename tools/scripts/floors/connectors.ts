import type { FloorPoint, NavConnector } from '../../../packages/map-data/src/types';

/** A step between two frames of one player that ends on another floor than it began on. */
export interface Crossing {
  readonly from: number;
  readonly to: number;
  /** Radar pixels, on the floor left and on the floor arrived at. */
  readonly leftAt: { readonly x: number; readonly y: number };
  readonly arrivedAt: { readonly x: number; readonly y: number };
}

/** A step this long between two frames is a teleport or a respawn, not a walk across floors. */
export const MAX_CROSSING_STEP_UNITS = 80;
/** Crossings whose midpoints are within this many radar pixels are one connector. */
export const CLUSTER_RADIUS_PX = 20;
/** A spot crossed fewer times than this is a jump or a glitch, not a way between floors. */
export const MIN_CROSSINGS = 3;
/**
 * Nor is a spot crossed less than this share as often as the busiest one on the map: the edge of an
 * overlap where tracks flicker over the altitude split makes a handful of crossings in the middle of
 * a corridor, against dozens at its stairs.
 */
export const MIN_SHARE_OF_BUSIEST = 0.1;

interface Cluster {
  readonly low: number;
  readonly high: number;
  x: number;
  y: number;
  count: number;
  readonly directions: { up: number; down: number };
  readonly sums: Map<number, { x: number; y: number; count: number }>;
}

function addSide(cluster: Cluster, floor: number, at: { x: number; y: number }): void {
  const side = cluster.sums.get(floor) ?? { x: 0, y: 0, count: 0 };
  side.x += at.x;
  side.y += at.y;
  side.count += 1;
  cluster.sums.set(floor, side);
}

function join(clusters: Cluster[], crossing: Crossing): void {
  const low = Math.min(crossing.from, crossing.to);
  const high = Math.max(crossing.from, crossing.to);
  const x = (crossing.leftAt.x + crossing.arrivedAt.x) / 2;
  const y = (crossing.leftAt.y + crossing.arrivedAt.y) / 2;

  let found = clusters.find(
    (cluster) =>
      cluster.low === low &&
      cluster.high === high &&
      Math.hypot(cluster.x - x, cluster.y - y) < CLUSTER_RADIUS_PX,
  );
  if (found === undefined) {
    found = {
      low,
      high,
      x,
      y,
      count: 0,
      directions: { up: 0, down: 0 },
      sums: new Map(),
    };
    clusters.push(found);
  }

  found.count += 1;
  found.x += (x - found.x) / found.count;
  found.y += (y - found.y) / found.count;
  if (crossing.to === high) found.directions.up += 1;
  else found.directions.down += 1;
  addSide(found, crossing.from, crossing.leftAt);
  addSide(found, crossing.to, crossing.arrivedAt);
}

function sideOf(cluster: Cluster, floor: number): FloorPoint {
  const side = cluster.sums.get(floor);
  const count = side?.count ?? 1;
  return {
    floor,
    x: Math.round((side?.x ?? cluster.x) / count),
    y: Math.round((side?.y ?? cluster.y) / count),
  };
}

export interface FoundConnector {
  readonly connector: NavConnector;
  readonly count: number;
}

/**
 * Where players change floor: crossings clustered by floor pair and place, each cluster seen at
 * least `MIN_CROSSINGS` times, and `MIN_SHARE_OF_BUSIEST` as often as the busiest, becoming a
 * connector. Each end is the mean of where players stood on
 * that floor. A cluster only ever crossed one way is a one-way connector from the floor it was
 * left from. Sorted by floors then place, so the same crossings always give the same list.
 */
export function clusterConnectors(crossings: readonly Crossing[]): FoundConnector[] {
  const clusters: Cluster[] = [];
  for (const crossing of crossings) join(clusters, crossing);

  const busiest = Math.max(0, ...clusters.map((cluster) => cluster.count));
  const floor = Math.max(MIN_CROSSINGS, busiest * MIN_SHARE_OF_BUSIEST);
  const found = clusters
    .filter((cluster) => cluster.count >= floor)
    .map((cluster): FoundConnector => {
      const isOneWay = cluster.directions.up === 0 || cluster.directions.down === 0;
      const startsLow = cluster.directions.up >= cluster.directions.down;
      const from = startsLow ? cluster.low : cluster.high;
      const to = startsLow ? cluster.high : cluster.low;
      const connector: NavConnector = {
        a: sideOf(cluster, from),
        b: sideOf(cluster, to),
        ...(isOneWay ? { isOneWay: true } : {}),
      };
      return { connector, count: cluster.count };
    });

  return found.sort(
    (p, q) =>
      p.connector.a.floor - q.connector.a.floor ||
      p.connector.b.floor - q.connector.b.floor ||
      p.connector.a.x - q.connector.a.x ||
      p.connector.a.y - q.connector.a.y,
  );
}

/** The cell at `at + offset * along`, or 0 past either end of its line. */
function neighbour(grid: Uint8Array, at: number, along: number, offset: number, inside: boolean) {
  return inside ? (grid[at + offset * along] ?? 0) : 0;
}

/** One axis of a morphology pass: each cell becomes the max (dilate) or min (erode) of its line neighbours. */
function pass(
  grid: Uint8Array,
  size: number,
  radius: number,
  isHorizontal: boolean,
  isDilate: boolean,
): Uint8Array {
  const out = new Uint8Array(grid.length);
  const along = isHorizontal ? 1 : size;
  const pick = isDilate ? Math.max : Math.min;

  for (let at = 0; at < grid.length; at++) {
    const position = isHorizontal ? at % size : Math.floor(at / size);
    let value = isDilate ? 0 : 1;
    for (let d = -radius; d <= radius; d++) {
      const isInside = position + d >= 0 && position + d < size;
      value = pick(value, neighbour(grid, at, along, d, isInside));
    }
    out[at] = value;
  }
  return out;
}

/** A square of side `2 * radius + 1` cells grown out of every set cell. */
export function dilate(grid: Uint8Array, size: number, radius: number): Uint8Array {
  if (radius === 0) return grid;
  return pass(pass(grid, size, radius, true, true), size, radius, false, true);
}

/** The cells whose whole square neighbourhood of `radius` is set; the edge of the grid counts as unset. */
export function erode(grid: Uint8Array, size: number, radius: number): Uint8Array {
  if (radius === 0) return grid;
  return pass(pass(grid, size, radius, true, false), size, radius, false, false);
}

/** Grow by two cells, then pull back by one: sample gaps between frames close and the shape stays a cell fuller. */
export function closeTrace(grid: Uint8Array, size: number): Uint8Array {
  return erode(dilate(grid, size, 2), size, 1);
}

/** Cells of `a` that are not in `b`. */
export function subtract(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((value, i) => (value === 1 && b[i] !== 1 ? 1 : 0));
}

export function intersect(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((value, i) => (value === 1 && b[i] === 1 ? 1 : 0));
}

/** The set cells of a packed grid back into one byte each. */
export function unpackBits(packed: Uint8Array, cells: number): Uint8Array {
  const out = new Uint8Array(cells);
  for (let i = 0; i < cells; i++) out[i] = ((packed[i >> 3] ?? 0) >> (7 - (i & 7))) & 1;
  return out;
}
