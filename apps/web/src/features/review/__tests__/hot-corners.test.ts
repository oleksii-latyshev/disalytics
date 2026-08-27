import { describe, expect, it } from 'vitest';
import {
  isInTopRightQuadrant,
  isOverBottomEdge,
  isStill,
  STILLNESS_MS,
} from '../helpers/hot-corners';

const WIDTH = 1440;
const HEIGHT = 900;

describe('isInTopRightQuadrant', () => {
  it('takes the quarter of the stage the cluster sits in', () => {
    expect(isInTopRightQuadrant(1400, 20, WIDTH, HEIGHT)).toBe(true);
    expect(isInTopRightQuadrant(720, 450, WIDTH, HEIGHT)).toBe(true);
  });

  it('leaves the other three quarters alone', () => {
    expect(isInTopRightQuadrant(40, 20, WIDTH, HEIGHT)).toBe(false);
    expect(isInTopRightQuadrant(1400, 880, WIDTH, HEIGHT)).toBe(false);
    expect(isInTopRightQuadrant(40, 880, WIDTH, HEIGHT)).toBe(false);
  });

  it('is a fraction of the viewport rather than a box, so it follows the window', () => {
    expect(isInTopRightQuadrant(500, 200, 800, 600)).toBe(true);
    expect(isInTopRightQuadrant(500, 200, WIDTH, HEIGHT)).toBe(false);
  });
});

describe('isOverBottomEdge', () => {
  it('is measured from the bottom of the viewport and not from the top', () => {
    expect(isOverBottomEdge(HEIGHT - 1, HEIGHT)).toBe(true);
    expect(isOverBottomEdge(HEIGHT - 80, HEIGHT)).toBe(true);
    expect(isOverBottomEdge(HEIGHT - 81, HEIGHT)).toBe(false);
    expect(isOverBottomEdge(40, HEIGHT)).toBe(false);
  });
});

describe('isStill', () => {
  it('waits out the whole of the stillness before it says so', () => {
    expect(isStill(STILLNESS_MS - 1, 0)).toBe(false);
    expect(isStill(STILLNESS_MS, 0)).toBe(true);
    expect(isStill(10_000 + STILLNESS_MS, 10_000)).toBe(true);
  });
});
