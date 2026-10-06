import { describe, expect, it } from 'vitest';
import { applyRects, keepComponents, labelComponents, packBits, traceLevel } from '../trace';

function image(size: number, floor: (x: number, y: number) => boolean): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) rgba[(y * size + x) * 4 + 3] = floor(x, y) ? 255 : 0;
  }
  return rgba;
}

describe('traceLevel', () => {
  it('reads opaque pixels as floor, keeps walls off by the erosion, ignores a ghost', () => {
    const rgba = image(16, (x) => x >= 4 && x < 12);
    const ghost = (4 * 16 + 14) * 4 + 3;
    rgba[ghost] = 64;

    const grid = traceLevel(rgba, 16, { cell: 4, erode: 0 });
    expect([...grid]).toEqual([0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0]);

    const eroded = traceLevel(rgba, 16, { cell: 4, erode: 2 });
    expect([...eroded].reduce((a, b) => a + b, 0)).toBeLessThan(8);
  });
});

describe('components', () => {
  const grid = Uint8Array.from([1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1].map((v) => v));

  it('labels by 4-connectivity', () => {
    expect(labelComponents(grid, 4).sizes).toEqual([3, 2]);
  });

  it('drops specks but keeps a seeded one', () => {
    expect([...keepComponents(grid, 4, [], 0.9)].reduce((a, b) => a + b, 0)).toBe(3);
    expect([...keepComponents(grid, 4, [15], 0.9)].reduce((a, b) => a + b, 0)).toBe(5);
  });
});

describe('overrides and packing', () => {
  it('opens before it closes, by cell centre', () => {
    const grid = new Uint8Array(4);
    applyRects(grid, 2, 8, [{ x: 0, y: 0, width: 16, height: 8 }], 1);
    expect([...grid]).toEqual([1, 1, 0, 0]);
    applyRects(grid, 2, 8, [{ x: 8, y: 0, width: 8, height: 8 }], 0);
    expect([...grid]).toEqual([1, 0, 0, 0]);
  });

  it('packs row-major, most significant bit first', () => {
    expect([...packBits(Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 1, 1]))]).toEqual([0x81, 0x80]);
  });
});
