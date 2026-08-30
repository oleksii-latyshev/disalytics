import { asFrame, asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { GLYPH_HIT_FLOOR_PX, GLYPH_HIT_HALF_PX, glyphHitHalves } from '../helpers/glyph-hits';
import type { AxisGlyph } from '../helpers/round-axis';

const WIDTH_PX = 1000;

/** Only the position decides a hit slot, so the event on the glyph is the cheapest one to build. */
function glyphAt(fraction: number): AxisGlyph {
  return {
    id: `plant-${fraction}`,
    frame: asFrame(0),
    fraction,
    event: { kind: 'plant', planter: asPlayerSlot(0) },
  };
}

function halvesAt(...fractions: readonly number[]): readonly number[] {
  return glyphHitHalves(fractions.map(glyphAt), WIDTH_PX);
}

describe('glyphHitHalves', () => {
  it('gives a glyph with room the target it has always had', () => {
    expect(halvesAt(0.2, 0.6)).toEqual([GLYPH_HIT_HALF_PX, GLYPH_HIT_HALF_PX]);
  });

  it('stops half way to a neighbour that is closer than that', () => {
    // 10px apart: each one reaches the midpoint and no further.
    expect(halvesAt(0.5, 0.51)).toEqual([5, 5]);
  });

  it('clamps a glyph to its nearest neighbour, whichever side it is on', () => {
    // 300px to the left, 6px to the right.
    expect(halvesAt(0.2, 0.5, 0.506)).toEqual([GLYPH_HIT_HALF_PX, 3, 3]);
  });

  it('leaves no two targets overlapping while there is room to tile', () => {
    const fractions = [0.1, 0.5, 0.505, 0.52, 0.9];
    const halves = halvesAt(...fractions);

    fractions.forEach((fraction, index) => {
      const next = fractions.at(index + 1);
      if (next === undefined) return;

      const rightEdge = fraction * WIDTH_PX + (halves.at(index) ?? 0);
      const leftEdge = next * WIDTH_PX - (halves.at(index + 1) ?? 0);

      expect(rightEdge).toBeLessThanOrEqual(leftEdge);
    });
  });

  it('keeps a target on every glyph, down to two events on the same tick', () => {
    // A slot the pointer cannot address at all is worse than two marks sharing a pixel — #268.
    for (const half of halvesAt(0.1, 0.5, 0.5, 0.5001, 0.9)) {
      expect(half).toBeGreaterThanOrEqual(GLYPH_HIT_FLOOR_PX);
    }
  });

  it('gives every glyph its full target before the axis has been measured', () => {
    expect(glyphHitHalves([glyphAt(0.5), glyphAt(0.5)], 0)).toEqual([
      GLYPH_HIT_HALF_PX,
      GLYPH_HIT_HALF_PX,
    ]);
  });

  it('has nothing to size on an empty axis', () => {
    expect(glyphHitHalves([], WIDTH_PX)).toEqual([]);
  });
});
