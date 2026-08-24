import { describe, expect, it } from 'vitest';
import type { CanvasSize } from '@/core/renderer';
import { TOKEN_MAX_RADIUS_PX, TOKEN_MIN_RADIUS_PX, TOKEN_RADIUS_PX } from '../helpers/tokens';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  plateBounds,
  plateGeometry,
  plateView,
  readPlateBounds,
  readPlateGeometry,
  resetView,
  zoomAbout,
  zoomByStep,
} from '../helpers/view';

const PLATE: CanvasSize = { width: 640, height: 640 };
const RADAR_SIZE = 1024;

/** Where a radar-image coordinate lands on the canvas under a given view. */
function project(view: { zoom: number; panX: number; panY: number }, radar: number): number {
  const out = plateGeometry();
  readPlateGeometry(view, PLATE, RADAR_SIZE, out);

  return radar * out.scale + out.offsetX;
}

describe('zoomAbout', () => {
  it('keeps the point under the pointer under the pointer', () => {
    const view = plateView();
    const anchor = 480;
    const radarUnderAnchor = (anchor - view.panX) / ((PLATE.width / RADAR_SIZE) * view.zoom);

    zoomAbout(view, 2, anchor, anchor, PLATE);

    expect(project(view, radarUnderAnchor)).toBeCloseTo(anchor, 6);
  });

  it('holds the anchor across a sequence of steps, so a wheel gesture does not drift', () => {
    const view = plateView();
    const anchor = 200;
    const radarUnderAnchor = (anchor - view.panX) / ((PLATE.width / RADAR_SIZE) * view.zoom);

    for (let step = 0; step < 5; step++) zoomAbout(view, 1.25, anchor, anchor, PLATE);

    expect(project(view, radarUnderAnchor)).toBeCloseTo(anchor, 6);
  });

  it('stops at the ends of the range rather than running past them', () => {
    const view = plateView();

    zoomAbout(view, 100, 0, 0, PLATE);
    expect(view.zoom).toBe(MAX_ZOOM);

    zoomAbout(view, 0.001, 0, 0, PLATE);
    expect(view.zoom).toBe(MIN_ZOOM);
  });
});

describe('panBy', () => {
  it('is pinned at rest, where the map already fills the plate', () => {
    const view = plateView();

    panBy(view, -200, -200, PLATE);

    expect({ x: view.panX, y: view.panY }).toEqual({ x: 0, y: 0 });
  });

  it('never lets an edge of the map come inside the plate', () => {
    const view = plateView();
    zoomByStep(view, 2, PLATE);

    panBy(view, 5000, 5000, PLATE);
    expect({ x: view.panX, y: view.panY }).toEqual({ x: 0, y: 0 });

    panBy(view, -5000, -5000, PLATE);
    expect(view.panX).toBe(PLATE.width * (1 - view.zoom));
    expect(view.panY).toBe(PLATE.height * (1 - view.zoom));
  });

  it('returns the pan to zero when the zoom comes back to rest', () => {
    const view = plateView();
    zoomByStep(view, 2, PLATE);
    panBy(view, -300, -300, PLATE);

    zoomByStep(view, 0.5, PLATE);

    expect({ zoom: view.zoom, x: view.panX, y: view.panY }).toEqual({
      zoom: MIN_ZOOM,
      x: 0,
      y: 0,
    });
  });
});

describe('readPlateGeometry', () => {
  it('carries the zoom in the scale, so a world coordinate lands where the map does', () => {
    const view = plateView();
    const out = plateGeometry();

    readPlateGeometry(view, PLATE, RADAR_SIZE, out);
    expect(out.scale).toBe(PLATE.width / RADAR_SIZE);

    zoomByStep(view, 2, PLATE);
    readPlateGeometry(view, PLATE, RADAR_SIZE, out);
    expect(out.scale).toBe((PLATE.width / RADAR_SIZE) * 2);
  });

  it('grows the token with the plate and stops where DESIGN.md §6.1 stops it', () => {
    const view = plateView();
    const out = plateGeometry();

    readPlateGeometry(view, PLATE, RADAR_SIZE, out);
    expect(out.tokenRadius).toBe(TOKEN_RADIUS_PX);

    zoomByStep(view, MAX_ZOOM, PLATE);
    readPlateGeometry(view, PLATE, RADAR_SIZE, out);
    expect(out.tokenRadius).toBe(TOKEN_MAX_RADIUS_PX);
  });

  it('never draws a token below the floor, whatever a future range does', () => {
    const out = plateGeometry();

    readPlateGeometry({ zoom: 0.1, panX: 0, panY: 0 }, PLATE, RADAR_SIZE, out);

    expect(out.tokenRadius).toBe(TOKEN_MIN_RADIUS_PX);
  });

  it('writes into the object the caller owns rather than minting one, because this runs in a draw', () => {
    const out = plateGeometry();
    const before = out;

    readPlateGeometry(plateView(), PLATE, RADAR_SIZE, out);

    expect(out).toBe(before);
  });
});

describe('readPlateBounds', () => {
  it('follows the pan, so the label placer keeps names on the part of the plate on screen', () => {
    const geometry = plateGeometry();
    const bounds = plateBounds();

    readPlateGeometry({ zoom: 2, panX: -100, panY: -60 }, PLATE, RADAR_SIZE, geometry);
    readPlateBounds(geometry, PLATE, bounds);

    // The map's corner sits 100px off the top-left of the plate, so what the reader can see starts
    // 100px into the coordinates the layer draws in.
    expect(bounds).toEqual({ left: 100, top: 60, width: PLATE.width, height: PLATE.height });
  });
});

describe('resetView', () => {
  it('puts the whole map back, whatever the reader had done to it', () => {
    const view = plateView();
    zoomByStep(view, 3, PLATE);
    panBy(view, -400, 120, PLATE);

    resetView(view);

    expect(view).toEqual({ zoom: MIN_ZOOM, panX: 0, panY: 0 });
  });
});
