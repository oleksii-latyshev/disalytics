import { describe, expect, it } from 'vitest';
import {
  type Crossing,
  closeTrace,
  clusterConnectors,
  dilate,
  erode,
  subtract,
  unpackBits,
} from '../connectors';

function crossing(from: number, to: number, x: number, y: number): Crossing {
  return {
    from,
    to,
    leftAt: { x, y },
    arrivedAt: { x: x + 2, y: y + 2 },
  };
}

function repeat(count: number, make: () => Crossing): Crossing[] {
  return Array.from({ length: count }, make);
}

describe('clusterConnectors', () => {
  it('makes one connector of crossings that share a place, ends at the mean of each side', () => {
    const found = clusterConnectors([
      ...repeat(5, () => crossing(0, 1, 100, 100)),
      ...repeat(5, () => crossing(1, 0, 104, 100)),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]?.count).toBe(10);
    expect(found[0]?.connector.isOneWay).toBeUndefined();
    expect(found[0]?.connector.a.floor).toBe(0);
    expect(found[0]?.connector.b.floor).toBe(1);
  });

  it('drops a spot crossed fewer than three times', () => {
    expect(clusterConnectors(repeat(2, () => crossing(0, 1, 100, 100)))).toHaveLength(0);
  });

  it('drops a spot crossed a tenth as often as the busiest', () => {
    const found = clusterConnectors([
      ...repeat(60, () => crossing(0, 1, 100, 100)),
      ...repeat(5, () => crossing(0, 1, 400, 400)),
      ...repeat(8, () => crossing(0, 1, 700, 700)),
    ]);
    expect(found.map((entry) => entry.count)).toEqual([60, 8]);
  });

  it('keeps places apart that are further than the cluster radius', () => {
    const found = clusterConnectors([
      ...repeat(4, () => crossing(0, 1, 100, 100)),
      ...repeat(4, () => crossing(0, 1, 150, 100)),
    ]);
    expect(found).toHaveLength(2);
  });

  it('marks a connector only ever crossed one way, from the floor it was left from', () => {
    const found = clusterConnectors(repeat(4, () => crossing(1, 0, 100, 100)));
    expect(found[0]?.connector.isOneWay).toBe(true);
    expect(found[0]?.connector.a.floor).toBe(1);
    expect(found[0]?.connector.b.floor).toBe(0);
  });

  it('is the same for the same crossings', () => {
    const crossings = [
      ...repeat(4, () => crossing(0, 1, 300, 300)),
      ...repeat(4, () => crossing(0, 1, 100, 100)),
    ];
    expect(clusterConnectors(crossings)).toEqual(clusterConnectors([...crossings]));
    expect(clusterConnectors(crossings)[0]?.connector.a.x).toBe(100);
  });
});

describe('masks', () => {
  const dot = (size: number, x: number, y: number) => {
    const grid = new Uint8Array(size * size);
    grid[y * size + x] = 1;
    return grid;
  };

  it('dilates by a square and erodes it back', () => {
    const grown = dilate(dot(9, 4, 4), 9, 1);
    expect(grown.reduce((a, b) => a + b, 0)).toBe(9);
    expect(erode(grown, 9, 1)).toEqual(dot(9, 4, 4));
  });

  it('closes a one-cell gap in a trace and keeps it a cell fuller', () => {
    const grid = new Uint8Array(81);
    for (const x of [1, 2, 4, 5]) grid[4 * 9 + x] = 1;
    const closed = closeTrace(grid, 9);
    expect(closed[4 * 9 + 3]).toBe(1);
    expect(closed[3 * 9 + 3]).toBe(1);
  });

  it('subtracts and unpacks', () => {
    expect([...subtract(Uint8Array.from([1, 1, 0]), Uint8Array.from([0, 1, 0]))]).toEqual([
      1, 0, 0,
    ]);
    expect([...unpackBits(Uint8Array.from([0b10100000]), 4)]).toEqual([1, 0, 1, 0]);
  });
});
