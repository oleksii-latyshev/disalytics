import { describe, expect, it } from 'vitest';
import { angleToPointer, RESTING_ANGLE } from '../helpers/watcher';

/** A card 576×222 whose right edge is at 1148, which is where it sits at 1440×900. */
const CARD = { top: 410, right: 1148, height: 222 };
/** Where the figure stands inside it: 44px in from the right edge, on the middle line. */
const ORIGIN = { x: 1104, y: 521 };

const degrees = (radians: number) => Math.round((radians * 180) / Math.PI);

describe('angleToPointer', () => {
  it('looks along the four axes', () => {
    expect(degrees(angleToPointer(CARD, ORIGIN.x + 300, ORIGIN.y))).toBe(0);
    expect(degrees(angleToPointer(CARD, ORIGIN.x, ORIGIN.y + 300))).toBe(90);
    expect(degrees(angleToPointer(CARD, ORIGIN.x - 300, ORIGIN.y))).toBe(180);
    expect(degrees(angleToPointer(CARD, ORIGIN.x, ORIGIN.y - 300))).toBe(-90);
  });

  it('looks at the corners', () => {
    expect(degrees(angleToPointer(CARD, ORIGIN.x + 100, ORIGIN.y + 100))).toBe(45);
    expect(degrees(angleToPointer(CARD, ORIGIN.x - 100, ORIGIN.y - 100))).toBe(-135);
  });

  it('does not care how far away the pointer is', () => {
    expect(angleToPointer(CARD, ORIGIN.x + 10, ORIGIN.y + 10)).toBeCloseTo(
      angleToPointer(CARD, ORIGIN.x + 1000, ORIGIN.y + 1000),
    );
  });

  // The pointer standing exactly where the figure does has no direction to give, and `atan2`
  // answers 0 rather than throwing. The mark is drawn under the pointer at that moment, so any
  // answer is as good as any other — this pins it down so it cannot become a NaN.
  it('answers a number when the pointer is on the figure', () => {
    expect(angleToPointer(CARD, ORIGIN.x, ORIGIN.y)).toBe(0);
  });

  it('rests looking down and to the left', () => {
    expect(degrees(RESTING_ANGLE)).toBe(135);
  });
});
