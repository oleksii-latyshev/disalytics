import { asFrame, asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  GLYPH_HIT_FLOOR_PX,
  GLYPH_HIT_HALF_PX,
  glyphHitHalves,
  hasRoomForSymbol,
} from '../helpers/glyph-hits';
import { type AxisGlyph, GLYPH_PITCH_PX } from '../helpers/round-axis';

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

describe('hasRoomForSymbol', () => {
  it('draws the symbol while the nearest mark is a whole glyph away', () => {
    // 240px apart, and then exactly one glyph apart, which is where two symbols meet and stop.
    expect(halvesAt(0.2, 0.44).every(hasRoomForSymbol)).toBe(true);
    expect(halvesAt(0.5, 0.5 + GLYPH_PITCH_PX / WIDTH_PX).every(hasRoomForSymbol)).toBe(true);
  });

  it('collapses a glyph whose neighbour is closer than that', () => {
    expect(halvesAt(0.5, 0.51).some(hasRoomForSymbol)).toBe(false);
  });

  it('collapses the crowded glyphs and leaves the rest of the axis alone (#271)', () => {
    // The shape of the fixture's densest round: a cluster of three inside 10px, and three events
    // with the axis to themselves. The old axis-wide average kept all six as symbols and drew the
    // cluster on top of itself.
    const halves = halvesAt(0.05, 0.3, 0.5, 0.505, 0.51, 0.9);

    expect(halves.map(hasRoomForSymbol)).toEqual([true, true, false, false, false, true]);
  });

  it('leaves no two symbols overlapping, whatever the round holds', () => {
    const fractions = [0.02, 0.1, 0.104, 0.3, 0.32, 0.33, 0.6, 0.9, 0.9001];
    const halves = halvesAt(...fractions);

    fractions.forEach((fraction, index) => {
      const next = fractions.at(index + 1);
      if (next === undefined) return;
      if (!hasRoomForSymbol(halves.at(index) ?? 0)) return;
      if (!hasRoomForSymbol(halves.at(index + 1) ?? 0)) return;

      expect((next - fraction) * WIDTH_PX).toBeGreaterThanOrEqual(GLYPH_PITCH_PX);
    });
  });

  it('keeps every symbol on an axis that has not been measured yet', () => {
    expect(glyphHitHalves([glyphAt(0.5), glyphAt(0.5)], 0).every(hasRoomForSymbol)).toBe(true);
  });
});
