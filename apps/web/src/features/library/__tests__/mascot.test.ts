import { describe, expect, it } from 'vitest';
import {
  angleToPointer,
  EYE_CELLS,
  MASCOT_COLUMNS,
  MASCOT_EYES,
  MASCOT_HEIGHT_PX,
  MASCOT_SPRITE,
  MASCOT_WIDTH_PX,
} from '../helpers/mascot';

/** The sprite's box in the viewport, wherever the card happens to put it. */
const BOX = { left: 780, top: 415 };
const MIDDLE = { x: BOX.left + MASCOT_WIDTH_PX / 2, y: BOX.top + MASCOT_HEIGHT_PX / 2 };

const degrees = (radians: number) => Math.round((radians * 180) / Math.PI);

describe('the sprite', () => {
  it('is a rectangle', () => {
    for (const row of MASCOT_SPRITE) expect(row).toHaveLength(MASCOT_COLUMNS);
  });

  // A sprite edited without its eyes moved is a face with a hole in the background beside it, and
  // nothing else in the product would catch that.
  it('has body under every cell of both eyes', () => {
    for (const eye of MASCOT_EYES) {
      for (let row = 0; row < EYE_CELLS; row++) {
        for (let column = 0; column < EYE_CELLS; column++) {
          expect(MASCOT_SPRITE[eye.row + row]?.[eye.column + column]).toBe('#');
        }
      }
    }
  });

  // A pupil sits one cell out from its socket's middle, so the socket's own edges are the furthest
  // it goes — and the row above and below it have to be body as well.
  it("leaves the eyes clear of the sprite's edges", () => {
    for (const eye of MASCOT_EYES) {
      expect(eye.column).toBeGreaterThan(0);
      expect(eye.column + EYE_CELLS).toBeLessThan(MASCOT_COLUMNS);
      expect(eye.row).toBeGreaterThan(0);
    }
  });
});

describe('angleToPointer', () => {
  it('looks along the four axes', () => {
    expect(degrees(angleToPointer(BOX, MIDDLE.x + 300, MIDDLE.y))).toBe(0);
    expect(degrees(angleToPointer(BOX, MIDDLE.x, MIDDLE.y + 300))).toBe(90);
    expect(degrees(angleToPointer(BOX, MIDDLE.x - 300, MIDDLE.y))).toBe(180);
    expect(degrees(angleToPointer(BOX, MIDDLE.x, MIDDLE.y - 300))).toBe(-90);
  });

  it('does not care how far away the pointer is', () => {
    expect(angleToPointer(BOX, MIDDLE.x + 10, MIDDLE.y + 10)).toBeCloseTo(
      angleToPointer(BOX, MIDDLE.x + 1000, MIDDLE.y + 1000),
    );
  });

  // The pointer standing exactly where the mascot does has no direction to give, and `atan2`
  // answers 0 rather than throwing. This pins that down so it cannot become a NaN in a draw.
  it('answers a number when the pointer is on the mascot', () => {
    expect(angleToPointer(BOX, MIDDLE.x, MIDDLE.y)).toBe(0);
  });
});
