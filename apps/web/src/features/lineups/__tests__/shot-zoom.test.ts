import { describe, expect, it } from 'vitest';
import {
  canPan,
  clampView,
  FITTED,
  fittedSize,
  MAX_ZOOM,
  MIN_ZOOM,
  wheelZoom,
  zoomAt,
} from '../helpers/shot-zoom';

/** A 16:9 screenshot in a frame that is wider still, so it fits by height. */
const FRAME = { width: 1000, height: 500 };
const IMAGE = { width: 1920, height: 1080 };
const FITTED_WIDTH = (500 * 1920) / 1080;

describe('fittedSize', () => {
  it('fits the image by its tighter side', () => {
    const size = fittedSize(FRAME, IMAGE);
    expect(size.height).toBe(500);
    expect(size.width).toBeCloseTo(FITTED_WIDTH);
  });

  it('takes the frame while the image has no size yet', () => {
    expect(fittedSize(FRAME, { width: 0, height: 0 })).toEqual(FRAME);
  });
});

describe('clampView', () => {
  it('keeps the zoom between fitted and four times', () => {
    expect(clampView({ zoom: 0.2, x: 0, y: 0 }, FRAME, IMAGE).zoom).toBe(MIN_ZOOM);
    expect(clampView({ zoom: 9, x: 0, y: 0 }, FRAME, IMAGE).zoom).toBe(MAX_ZOOM);
  });

  it('cannot move a fitted image at all', () => {
    expect(clampView({ zoom: 1, x: 300, y: -200 }, FRAME, IMAGE)).toEqual(FITTED);
  });

  it('moves a zoomed image no further than its edge reaches the frame', () => {
    const view = clampView({ zoom: 2, x: 10_000, y: -10_000 }, FRAME, IMAGE);
    expect(view.x).toBeCloseTo((FITTED_WIDTH * 2 - 1000) / 2);
    expect(view.y).toBeCloseTo(-(500 * 2 - 500) / 2);
  });
});

describe('zoomAt', () => {
  it('zooms about the centre without moving it', () => {
    expect(zoomAt(FITTED, 2, FRAME, IMAGE)).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it('keeps what is under the cursor under it', () => {
    const point = { x: 200, y: 100 };
    const view = zoomAt(FITTED, 2, FRAME, IMAGE, point);
    // The image point under the cursor was `point` at zoom 1; at zoom 2 it sits at x + 2 * point.
    expect(view.x + 2 * point.x).toBeCloseTo(point.x);
    expect(view.y + 2 * point.y).toBeCloseTo(point.y);
  });

  it('returns to fitted when zoomed all the way out', () => {
    const zoomed = zoomAt(FITTED, 3, FRAME, IMAGE, { x: 300, y: 150 });
    expect(zoomAt(zoomed, 1, FRAME, IMAGE, { x: -100, y: 0 })).toEqual(FITTED);
  });
});

describe('wheelZoom', () => {
  it('zooms in on a wheel up and out on a wheel down', () => {
    expect(wheelZoom(1, -100)).toBeGreaterThan(1);
    expect(wheelZoom(2, 100)).toBeLessThan(2);
  });
});

describe('canPan', () => {
  it('is false while fitted and true once the image outgrows its frame', () => {
    expect(canPan(FITTED, FRAME, IMAGE)).toBe(false);
    expect(canPan({ zoom: 1.5, x: 0, y: 0 }, FRAME, IMAGE)).toBe(true);
  });
});
