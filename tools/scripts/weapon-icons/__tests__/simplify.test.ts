import { describe, expect, it } from 'vitest';
import { flattenPath, parseCommands } from '../path';
import { ringsToPath, simplifyIconPath, simplifyRing } from '../simplify';

describe('parseCommands', () => {
  it('reads a command for every argument group', () => {
    expect(parseCommands('M1 2L3 4')).toEqual([
      { code: 'M', args: [1, 2] },
      { code: 'L', args: [3, 4] },
    ]);
  });

  it('continues a repeated command, and reads a repeated moveto as a lineto', () => {
    expect(parseCommands('M1 2 3 4')).toEqual([
      { code: 'M', args: [1, 2] },
      { code: 'L', args: [3, 4] },
    ]);
  });

  // The bug this guards let one `z` end the parse, which silently dropped every outline after the
  // first — a rifle with no trigger guard and no magazine, and nothing to say so.
  it('keeps reading after a closed subpath', () => {
    expect(parseCommands('M0 0L1 0zM2 2L3 2z')).toHaveLength(6);
  });

  it('refuses a command it cannot draw rather than skipping it', () => {
    expect(() => parseCommands('M0 0A1 1 0 0 1 2 2')).toThrow(/unsupported/);
  });
});

describe('flattenPath', () => {
  it('closes a rectangle written with the shorthand commands', () => {
    expect(flattenPath('M1 1h4v2h-4z')).toEqual([
      [
        { x: 1, y: 1 },
        { x: 5, y: 1 },
        { x: 5, y: 3 },
        { x: 1, y: 3 },
      ],
    ]);
  });

  it('samples a cubic into points rather than dropping it', () => {
    const [ring] = flattenPath('M0 0C0 4 8 4 8 0z');

    expect(ring?.length).toBeGreaterThan(8);
    expect(ring?.at(-1)).toEqual({ x: 8, y: 0 });
  });

  it('gives every subpath a ring of its own', () => {
    expect(flattenPath('M0 0h2v2h-2zM4 4h2v2h-2z')).toHaveLength(2);
  });
});

describe('simplifyRing', () => {
  it('keeps the corners of a rectangle at a tolerance below its own size', () => {
    const ring = simplifyRing(flattenPath('M0 0h10v4h-10z')[0] ?? [], 0.3);

    expect(ring).toHaveLength(4);
  });

  it('drops the detail a tolerance covers', () => {
    const stepped = flattenPath('M0 0h4v0.1h4v-0.1h4v4h-12z')[0] ?? [];

    expect(simplifyRing(stepped, 0.3).length).toBeLessThan(stepped.length);
  });

  // A ring cut anywhere but at its far end lets the simplifier flatten both extremes into the chord
  // between them, which is a barrel losing its muzzle.
  it('keeps both ends of a long thin ring', () => {
    const ring = simplifyRing(flattenPath('M0 0h40v2h-40z')[0] ?? [], 0.3);

    expect(Math.max(...ring.map((point) => point.x))).toBe(40);
  });
});

describe('ringsToPath', () => {
  it('writes closed polygons with the decimals it is given', () => {
    const rings = [
      [
        { x: 1.24, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 4.06 },
      ],
    ];

    expect(ringsToPath(rings, 1)).toBe('M1.2 2L3 2L3 4.1Z');
  });

  it('leaves out the separator a negative number carries itself', () => {
    expect(
      ringsToPath(
        [
          [
            { x: 1, y: -2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
          ],
        ],
        1,
      ),
    ).toBe('M1-2L3 4L5 6Z');
  });

  it('drops a ring with no area to fill', () => {
    expect(
      ringsToPath(
        [
          [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        ],
        1,
      ),
    ).toBe('');
  });
});

describe('simplifyIconPath', () => {
  it('answers a path of straight segments only', () => {
    const d = simplifyIconPath('M0 0C0 8 16 8 16 0z', 0.3, 1);

    expect(d).toMatch(/^M[\d.\-ML ]+Z$/);
    expect(d).not.toContain('C');
  });
});
