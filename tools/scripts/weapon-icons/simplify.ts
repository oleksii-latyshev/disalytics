import { flattenPath, type Point } from './path';

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point.x - from.x, point.y - from.y);

  return Math.abs(dx * (from.y - point.y) - (from.x - point.x) * dy) / length;
}

/** Ramer–Douglas–Peucker over an open polyline, keeping both ends. */
function simplifyLine(points: readonly Point[], tolerance: number): Point[] {
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length < 3 || first === undefined || last === undefined) return [...points];

  let farthest = 0;
  let worst = -1;
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    if (point === undefined) continue;

    const offset = distanceToSegment(point, first, last);
    if (offset > worst) {
      worst = offset;
      farthest = index;
    }
  }

  if (worst <= tolerance) return [first, last];

  const head = simplifyLine(points.slice(0, farthest + 1), tolerance);
  const tail = simplifyLine(points.slice(farthest), tolerance);

  return [...head.slice(0, -1), ...tail];
}

/**
 * The same, over a closed ring. A ring has no ends to keep, so it is cut at the point farthest from
 * its first: cutting anywhere else lets the simplifier flatten the ring's two extremes into the
 * chord between them, which is how a barrel loses its muzzle.
 */
export function simplifyRing(ring: readonly Point[], tolerance: number): Point[] {
  const first = ring[0];
  if (ring.length < 4 || first === undefined) return [...ring];

  let farthest = 0;
  let worst = -1;
  for (let index = 1; index < ring.length; index += 1) {
    const point = ring[index];
    if (point === undefined) continue;

    const span = Math.hypot(point.x - first.x, point.y - first.y);
    if (span > worst) {
      worst = span;
      farthest = index;
    }
  }

  const head = simplifyLine(ring.slice(0, farthest + 1), tolerance);
  const tail = simplifyLine([...ring.slice(farthest), first], tolerance);

  return [...head.slice(0, -1), ...tail.slice(0, -1)];
}

function format(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;

  return trimmed === '' || trimmed === '-0' ? '0' : trimmed;
}

export function ringsToPath(rings: readonly (readonly Point[])[], decimals: number): string {
  const parts: string[] = [];

  for (const ring of rings) {
    if (ring.length < 3) continue;

    ring.forEach((point, index) => {
      const x = format(point.x, decimals);
      const y = format(point.y, decimals);
      parts.push(`${index === 0 ? 'M' : 'L'}${x}${y.startsWith('-') ? '' : ' '}${y}`);
    });
    parts.push('Z');
  }

  return parts.join('');
}

/**
 * Valve's outline, redrawn as polygons a row can carry. The tolerance is in the icon's own units —
 * its box is 32 tall — so 0.3 is under a tenth of a pixel wherever the product draws one of these.
 *
 * A ring the simplification collapses to fewer than three points is dropped rather than kept flat:
 * it was a detail smaller than the tolerance, and a zero-area ring in an even-odd fill is a seam.
 */
export function simplifyIconPath(d: string, tolerance: number, decimals: number): string {
  const rings = flattenPath(d)
    .map((ring) => simplifyRing(ring, tolerance))
    .filter((ring) => ring.length >= 3);

  return ringsToPath(rings, decimals);
}
