import { describe, expect, it } from 'vitest';
import { simplifyRoute } from '../helpers/route-simplify';

describe('simplifyRoute', () => {
  it('keeps only the ends of a straight line', () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }));
    expect(simplifyRoute(line, 5)).toEqual([0, 19]);
  });

  it('keeps the corner of an L', () => {
    const path = [
      ...Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 0 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 90, y: (i + 1) * 10 })),
    ];
    expect(simplifyRoute(path, 5)).toEqual([0, 9, 19]);
  });

  it('drops a wobble inside the tolerance', () => {
    const wobble = [
      { x: 0, y: 0 },
      { x: 50, y: 4 },
      { x: 100, y: 0 },
    ];
    expect(simplifyRoute(wobble, 10)).toEqual([0, 2]);
    expect(simplifyRoute(wobble, 2)).toEqual([0, 1, 2]);
  });

  it('keeps an anchor even on a straight line', () => {
    const line = Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 }));
    expect(simplifyRoute(line, 5, [4])).toEqual([0, 4, 10]);
  });

  it('handles empty and single-point paths', () => {
    expect(simplifyRoute([], 5)).toEqual([]);
    expect(simplifyRoute([{ x: 1, y: 1 }], 5)).toEqual([0]);
  });
});
