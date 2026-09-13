import { describe, expect, it } from 'vitest';
import {
  eyeCells,
  HEAD_COLUMNS,
  HEADS,
  lookToward,
  MASCOT_COLUMNS,
  MASCOT_HEIGHT_PX,
  MASCOT_WIDTH_PX,
  type MascotSide,
  SHOULDERS,
  type Step,
} from '../helpers/mascot';

/** The sprite's box in the viewport, wherever the card happens to put it. */
const BOX = { left: 780, top: 415 };
const MIDDLE = { x: BOX.left + MASCOT_WIDTH_PX / 2, y: BOX.top + MASCOT_HEIGHT_PX / 2 };

const SIDES: readonly MascotSide[] = ['ct', 't'];
const STEPS: readonly Step[] = [-1, 0, 1];

describe('the sprites', () => {
  it('are rectangles', () => {
    for (const side of SIDES) {
      for (const row of HEADS[side]) expect(row).toHaveLength(HEAD_COLUMNS);
    }
    for (const row of SHOULDERS) expect(row).toHaveLength(MASCOT_COLUMNS);
  });

  // An eye drawn on body is an eye nobody can see, and a sprite edited without its eyes moved
  // would do exactly that with nothing else in the product to notice.
  it('put every eye in a hole, for every look', () => {
    for (const side of SIDES) {
      for (const lookX of STEPS) {
        for (const lookY of STEPS) {
          for (const eye of eyeCells({ side, lookX, lookY })) {
            expect(HEADS[side][eye.row]?.[eye.column], `${side} ${lookX},${lookY}`).toBe('o');
          }
        }
      }
    }
  });

  it("keeps a T's two eyes apart", () => {
    const [left, right] = eyeCells({ side: 't', lookX: 1, lookY: 0 });
    expect(right?.column).toBeGreaterThan((left?.column ?? 0) + 1);
  });
});

describe('lookToward', () => {
  it('faces the reader while the pointer is over the figure', () => {
    expect(lookToward(BOX, MIDDLE.x, MIDDLE.y)).toEqual({ lookX: 0, lookY: 0 });
    expect(lookToward(BOX, MIDDLE.x + 30, MIDDLE.y - 30)).toEqual({ lookX: 0, lookY: 0 });
  });

  it('turns one step along each axis towards the pointer', () => {
    expect(lookToward(BOX, MIDDLE.x + 300, MIDDLE.y)).toEqual({ lookX: 1, lookY: 0 });
    expect(lookToward(BOX, MIDDLE.x - 300, MIDDLE.y + 300)).toEqual({ lookX: -1, lookY: 1 });
    expect(lookToward(BOX, MIDDLE.x, MIDDLE.y - 1000)).toEqual({ lookX: 0, lookY: -1 });
  });
});
