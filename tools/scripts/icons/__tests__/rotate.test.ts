import { describe, expect, it } from 'vitest';
import { rotateIconPath } from '../rotate';

/** A 10-wide, 2-tall bar lying flat, which is the shape a rotation is easiest to reason about. */
const BAR = 'M0 0L10 0L10 2L0 2Z';

describe('rotateIconPath', () => {
  it('turns a lying shape upright and swaps its box with it', () => {
    const turned = rotateIconPath(BAR, -90, 10, 2, 1);

    expect(turned.width).toBe(2);
    expect(turned.height).toBe(10);
  });

  it('re-boxes to the origin, so nothing is drawn outside its own width and height', () => {
    const turned = rotateIconPath(BAR, -45, 10, 2, 1);
    const numbers = turned.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const ys = numbers.filter((_, index) => index % 2 === 1);

    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(turned.width + 0.05);
    expect(Math.max(...ys)).toBeLessThanOrEqual(turned.height + 0.05);
  });

  it('moves no point relative to any other — it is a rotation, not a redraw', () => {
    const before = rotateIconPath(BAR, 0, 10, 2, 3);
    const after = rotateIconPath(BAR, 37, 10, 2, 3);
    const corners = (d: string) => {
      const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];

      return Array.from({ length: n.length / 2 }, (_, i) => [n[i * 2] ?? 0, n[i * 2 + 1] ?? 0]);
    };
    const span = (points: number[][]) =>
      points.map(([x = 0, y = 0]) =>
        Math.hypot(x - (points[0]?.[0] ?? 0), y - (points[0]?.[1] ?? 0)),
      );

    // Every distance from the first vertex survives the turn.
    const one = span(corners(before.d));
    const two = span(corners(after.d));
    for (const [index, distance] of one.entries()) {
      expect(two[index] ?? 0).toBeCloseTo(distance, 2);
    }
  });

  it('gives a shape with no points back unchanged rather than a box of NaN', () => {
    expect(rotateIconPath('', -45, 10, 2, 1)).toEqual({ d: '', width: 10, height: 2 });
  });

  it('turns four quarter-turns back into the shape it started as', () => {
    let current = { d: BAR, width: 10, height: 2 };
    for (let turn = 0; turn < 4; turn++) {
      current = rotateIconPath(current.d, 90, current.width, current.height, 3);
    }

    expect(current.width).toBeCloseTo(10, 2);
    expect(current.height).toBeCloseTo(2, 2);
  });
});
