import { floorAt, mapFloors } from './floors';
import { plateLayout, plateToRadar } from './layout';
import { findNavPath, snapToWalkable } from './pathfinding';
import { radarToWorld, radarX, radarY } from './transform';
import type {
  FloorPoint,
  MapOverview,
  NavConnector,
  NavGrid,
  NavPath,
  RadarPoint,
  WorldPlanePoint,
} from './types';

/** What taking a connector costs on top of the walk to it, in radar pixels: stairs and ladders are slow. */
export const CONNECTOR_COST_PX = 24;

export interface FloorPath {
  /** Each point carries its floor; two consecutive points on different floors are a connector. */
  readonly points: readonly FloorPoint[];
  readonly reachable: boolean;
}

interface Node {
  readonly point: FloorPoint;
  /** The node on the other floor a connector leads to from here, with the connector it is. */
  readonly link: { readonly to: number; readonly connector: NavConnector } | undefined;
}

interface Leg {
  readonly length: number;
  readonly path: NavPath;
}

const START = 0;
const END = 1;

function distance(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polylineLength(path: NavPath): number {
  let total = 0;
  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1];
    const b = path.points[i];
    if (a !== undefined && b !== undefined) total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

function onFloor(points: readonly { x: number; y: number }[], floor: number): FloorPoint[] {
  return points.map((point) => ({ x: point.x, y: point.y, floor }));
}

function straight(from: FloorPoint, to: FloorPoint): FloorPath {
  return { points: [from, to], reachable: false };
}

/** A walk between two nodes of one floor, or `undefined` when no ground joins them. */
function legBetween(grid: NavGrid, from: FloorPoint, to: FloorPoint): Leg | undefined {
  const level = grid.levels[from.floor];
  if (level === undefined || from.floor !== to.floor) return undefined;
  const path = findNavPath(level, from, to);
  return path.reachable ? { length: polylineLength(path), path } : undefined;
}

/** The two ends of every connector, from node index `offset` on, each linked to the other. */
function connectorNodes(grid: NavGrid, offset: number): Node[] {
  const nodes: Node[] = [];
  for (const connector of grid.connectors) {
    const first = offset + nodes.length;
    nodes.push({
      point: connector.a,
      link: { to: first + 1, connector },
    });
    nodes.push({
      point: connector.b,
      link: connector.isOneWay === true ? undefined : { to: first, connector },
    });
  }
  return nodes;
}

/** The shortest a route through any connector could be, from straight lines alone. */
function connectorLowerBound(nodes: readonly Node[], start: FloorPoint, end: FloorPoint): number {
  let toFirst = Number.POSITIVE_INFINITY;
  let fromLast = Number.POSITIVE_INFINITY;
  for (const node of nodes.slice(2)) {
    toFirst = Math.min(toFirst, distance(start, node.point));
    fromLast = Math.min(fromLast, distance(node.point, end));
  }
  return toFirst + CONNECTOR_COST_PX + fromLast;
}

interface Search {
  readonly cost: number[];
  readonly from: number[];
  readonly legs: (Leg | undefined)[];
}

function expand(grid: NavGrid, nodes: readonly Node[], search: Search, at: number): void {
  const here = nodes[at];
  if (here === undefined) return;
  const base = search.cost[at] ?? Number.POSITIVE_INFINITY;

  const relax = (to: number, cost: number, leg: Leg | undefined) => {
    if (cost >= (search.cost[to] ?? Number.POSITIVE_INFINITY)) return;
    search.cost[to] = cost;
    search.from[to] = at;
    search.legs[to] = leg;
  };

  if (here.link !== undefined) {
    const target = nodes[here.link.to];
    if (target !== undefined)
      relax(here.link.to, base + distance(here.point, target.point) + CONNECTOR_COST_PX, undefined);
  }
  for (const [to, node] of nodes.entries()) {
    if (to === at || to === START || node.point.floor !== here.point.floor) continue;
    const leg = legBetween(grid, here.point, node.point);
    if (leg !== undefined) relax(to, base + leg.length, leg);
  }
}

/** Dijkstra over the start, the end and every connector end, with a walk as each same-floor edge. */
function searchNodes(grid: NavGrid, nodes: readonly Node[]): Search {
  const search: Search = {
    cost: nodes.map(() => Number.POSITIVE_INFINITY),
    from: nodes.map(() => -1),
    legs: nodes.map(() => undefined),
  };
  search.cost[START] = 0;
  const closed = new Set<number>();

  for (;;) {
    let best = -1;
    for (const [index, cost] of search.cost.entries()) {
      if (closed.has(index) || cost === Number.POSITIVE_INFINITY) continue;
      if (best < 0 || cost < (search.cost[best] ?? Number.POSITIVE_INFINITY)) best = index;
    }
    if (best < 0 || best === END) return search;
    closed.add(best);
    expand(grid, nodes, search, best);
  }
}

function assemble(nodes: readonly Node[], search: Search): FloorPoint[] {
  const chain: number[] = [];
  for (let at = END; at !== -1; at = search.from[at] ?? -1) chain.push(at);
  chain.reverse();

  const first = nodes[START];
  const points: FloorPoint[] = first === undefined ? [] : [first.point];
  for (const index of chain.slice(1)) {
    const leg = search.legs[index];
    const node = nodes[index];
    if (leg !== undefined)
      points.push(...onFloor(leg.path.points.slice(1), node?.point.floor ?? 0));
    else if (node !== undefined) points.push(node.point);
  }
  return points;
}

/** Both ends moved onto walkable ground of their floor, or `undefined` when either has none near. */
function snapEnds(
  grid: NavGrid,
  from: FloorPoint,
  to: FloorPoint,
): { readonly start: FloorPoint; readonly end: FloorPoint } | undefined {
  const fromLevel = grid.levels[from.floor];
  const toLevel = grid.levels[to.floor];
  if (fromLevel === undefined || toLevel === undefined) return undefined;

  const start = snapToWalkable(fromLevel, from);
  const end = snapToWalkable(toLevel, to);
  if (start === undefined || end === undefined) return undefined;
  return {
    start: { x: start.x, y: start.y, floor: from.floor },
    end: { x: end.x, y: end.y, floor: to.floor },
  };
}

/**
 * The shortest walk between two points that may be on different floors. Each floor is walked with
 * `findNavPath`, and floors are joined only through the grid's connectors, each costing
 * `CONNECTOR_COST_PX` more than the walk to it. On one floor, with no connector shorter than the
 * walk, this is exactly `findNavPath`. Ends with no way between them come back as a straight
 * segment with `reachable: false`.
 */
export function findFloorPath(grid: NavGrid, from: FloorPoint, to: FloorPoint): FloorPath {
  const ends = snapEnds(grid, from, to);
  if (ends === undefined) return straight(from, to);
  const { start, end } = ends;

  const level = grid.levels[from.floor];
  const direct =
    level !== undefined && from.floor === to.floor ? findNavPath(level, start, end) : undefined;
  const directLength =
    direct?.reachable === true ? polylineLength(direct) : Number.POSITIVE_INFINITY;
  const nodes: Node[] = [
    { point: start, link: undefined },
    { point: end, link: undefined },
  ];
  nodes.push(...connectorNodes(grid, nodes.length));

  const canShortcut = nodes.length > 2 && connectorLowerBound(nodes, start, end) < directLength;
  if (direct !== undefined && !canShortcut) {
    return direct.reachable
      ? { points: onFloor(direct.points, from.floor), reachable: true }
      : straight(start, end);
  }

  const search = searchNodes(grid, nodes);
  if ((search.cost[END] ?? Number.POSITIVE_INFINITY) === Number.POSITIVE_INFINITY) {
    return direct === undefined ? straight(from, to) : straight(start, end);
  }
  return { points: assemble(nodes, search), reachable: true };
}

/**
 * `findFloorPath` over a map's plate: points in and out are plate pixels, the floor of each end is
 * the plate slot it falls in, and every point of the route is placed in the slot of its own floor.
 * A floor that shares a level's image (Mirage's underpass) is drawn in that level's slot.
 */
export function findPlatePath(
  overview: MapOverview,
  grid: NavGrid,
  from: RadarPoint,
  to: RadarPoint,
): NavPath {
  const a = plateToRadar(overview, from.x, from.y);
  const b = plateToRadar(overview, to.x, to.y);
  const result = findFloorPath(
    grid,
    { x: a.x, y: a.y, floor: a.levelIndex },
    { x: b.x, y: b.y, floor: b.levelIndex },
  );
  if (!result.reachable) return { points: [from, to], reachable: false };

  const { slots } = plateLayout(overview);
  const floors = mapFloors(overview);
  return {
    reachable: true,
    points: result.points.map((point) => {
      const slot = slots[floors[point.floor]?.level ?? 0];
      return {
        x: point.x - (slot?.cropX ?? 0) + (slot?.x ?? 0),
        y: point.y - (slot?.cropY ?? 0) + (slot?.y ?? 0),
      };
    }),
  };
}

export interface NavWorldPath {
  readonly points: readonly (WorldPlanePoint & { readonly floor: number })[];
  readonly reachable: boolean;
}

/**
 * `findFloorPath` in world units. `fromZ` and `toZ` pick each end's floor (`floorAt`'s rule), and
 * every point of the route says which floor it is on.
 */
export function findWorldPath(
  overview: MapOverview,
  grid: NavGrid,
  from: WorldPlanePoint,
  fromZ: number,
  to: WorldPlanePoint,
  toZ: number,
): NavWorldPath {
  const a: FloorPoint = {
    x: radarX(overview, from.x),
    y: radarY(overview, from.y),
    floor: floorAt(overview, from.x, from.y, fromZ),
  };
  const b: FloorPoint = {
    x: radarX(overview, to.x),
    y: radarY(overview, to.y),
    floor: floorAt(overview, to.x, to.y, toZ),
  };

  const path = findFloorPath(grid, a, b);
  if (!path.reachable) {
    return {
      points: [
        { ...from, floor: a.floor },
        { ...to, floor: b.floor },
      ],
      reachable: false,
    };
  }
  return {
    reachable: true,
    points: path.points.map((point) => ({ ...radarToWorld(overview, point), floor: point.floor })),
  };
}
