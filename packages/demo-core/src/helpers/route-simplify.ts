export interface PlanarPoint {
  readonly x: number;
  readonly y: number;
}

function distanceToSegment(point: PlanarPoint, from: PlanarPoint, to: PlanarPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.y - from.y);
  const along = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
  const clamped = Math.min(1, Math.max(0, along));
  return Math.hypot(point.x - (from.x + clamped * dx), point.y - (from.y + clamped * dy));
}

function farthestPoint(
  points: readonly PlanarPoint[],
  start: number,
  end: number,
  toleranceUnits: number,
): number {
  const first = points[start];
  const last = points[end];
  if (first === undefined || last === undefined) return -1;
  let farthest = -1;
  let farthestDistance = toleranceUnits;
  for (let i = start + 1; i < end; i++) {
    const point = points[i];
    if (point === undefined) continue;
    const distance = distanceToSegment(point, first, last);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthest = i;
    }
  }
  return farthest;
}

/** Marks the points of `from..to` that Ramer–Douglas–Peucker keeps, walking an explicit stack. */
function markKept(
  points: readonly PlanarPoint[],
  from: number,
  to: number,
  toleranceUnits: number,
  kept: boolean[],
): void {
  const stack: [number, number][] = [[from, to]];
  for (let range = stack.pop(); range !== undefined; range = stack.pop()) {
    const [start, end] = range;
    if (end - start < 2) continue;
    const farthest = farthestPoint(points, start, end, toleranceUnits);
    if (farthest === -1) continue;
    kept[farthest] = true;
    stack.push([start, farthest], [farthest, end]);
  }
}

/**
 * The indices of `points` that still describe the path within `toleranceUnits`: the first, the last,
 * every index in `anchors` and the corners between them (Ramer–Douglas–Peucker). Ascending.
 */
export function simplifyRoute(
  points: readonly PlanarPoint[],
  toleranceUnits: number,
  anchors: readonly number[] = [],
): readonly number[] {
  if (points.length === 0) return [];
  const lastIndex = points.length - 1;
  const kept: boolean[] = points.map(() => false);
  kept[0] = true;
  kept[lastIndex] = true;
  for (const anchor of anchors) {
    if (anchor >= 0 && anchor <= lastIndex) kept[anchor] = true;
  }

  let previous = 0;
  for (let i = 1; i <= lastIndex; i++) {
    if (!kept[i]) continue;
    markKept(points, previous, i, toleranceUnits, kept);
    previous = i;
  }
  return kept.flatMap((isKept, index) => (isKept ? [index] : []));
}
