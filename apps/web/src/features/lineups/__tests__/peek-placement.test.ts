import { describe, expect, it } from 'vitest';
import { miniMapFrame } from '../helpers/mini-map-frame';
import { peekPlacement } from '../helpers/peek-placement';

const PLATE = { width: 1000, height: 1000 };

describe('peekPlacement', () => {
  it('opens to the right of an origin in the left of the plate, level with it', () => {
    expect(peekPlacement({ x: 300, y: 500 }, PLATE)).toEqual({ side: 'right', align: 'center' });
  });

  it('flips to the left of an origin in the right of the plate', () => {
    expect(peekPlacement({ x: 800, y: 500 }, PLATE).side).toBe('left');
  });

  it('holds the card down from an origin near the top and up from one near the bottom', () => {
    expect(peekPlacement({ x: 300, y: 100 }, PLATE).align).toBe('start');
    expect(peekPlacement({ x: 300, y: 900 }, PLATE).align).toBe('end');
  });

  it('reads the shape of a plate that is not square', () => {
    const wide = { width: 2000, height: 500 };

    expect(peekPlacement({ x: 1400, y: 60 }, wide)).toEqual({ side: 'left', align: 'start' });
  });
});

describe('miniMapFrame', () => {
  it('is 16:9 and holds both ends of a throw', () => {
    const frame = miniMapFrame(
      [
        { x: 400, y: 400 },
        { x: 600, y: 500 },
      ],
      PLATE,
    );

    expect(frame.width / frame.height).toBeCloseTo(16 / 9);
    expect(frame.x).toBeLessThan(400);
    expect(frame.x + frame.width).toBeGreaterThan(600);
    expect(frame.y).toBeLessThan(400);
    expect(frame.y + frame.height).toBeGreaterThan(500);
  });

  it('is never smaller than a callout neighbourhood', () => {
    expect(miniMapFrame([{ x: 500, y: 500 }], PLATE).width).toBe(320);
  });

  it('slides back inside the plate at a corner', () => {
    const frame = miniMapFrame(
      [
        { x: 10, y: 10 },
        { x: 40, y: 30 },
      ],
      PLATE,
    );

    expect(frame.x).toBe(0);
    expect(frame.y).toBe(0);
  });

  it('never outgrows the plate', () => {
    const frame = miniMapFrame(
      [
        { x: 0, y: 0 },
        { x: 1000, y: 1000 },
      ],
      PLATE,
    );

    expect(frame.width).toBeLessThanOrEqual(PLATE.width);
    expect(frame.y + frame.height).toBeLessThanOrEqual(PLATE.height);
  });
});
