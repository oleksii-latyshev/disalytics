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
  radarPointAt,
  readPlateBounds,
  readPlateGeometry,
  resetView,
  zoomAbout,
  zoomByStep,
} from '../helpers/view';

const PLATE: CanvasSize = { width: 640, height: 640 };
const RADAR_SIZE = 1024;

// The plate at 1440×900, at rest and expanded — §5.1's own figures, so a reading here is a reading
// of the screen rather than of a round number. Expanded it keeps the height that was binding the
// square and takes the width the reading cards leave.
const AT_REST: CanvasSize = { width: 716, height: 716 };
const EXPANDED: CanvasSize = { width: 1392, height: 716 };

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

describe('radarPointAt', () => {
  // The readout has to answer for the map the layers drew, so the only property worth asserting is
  // that it undoes `readPlateGeometry` exactly — a second formula that merely looks like the
  // inverse is how a panned plate ends up reporting the coordinates of an unpanned one.
  it('is readPlateGeometry run backwards, at every zoom and pan', () => {
    const views = [
      { zoom: MIN_ZOOM, panX: 0, panY: 0 },
      { zoom: 2, panX: -100, panY: -60 },
      { zoom: MAX_ZOOM, panX: -640, panY: -320 },
    ];

    const geometry = plateGeometry();

    for (const view of views) {
      readPlateGeometry(view, PLATE, RADAR_SIZE, geometry);

      for (const radar of [0, 137, 512, 1024]) {
        // `project` is the x axis only, and the two pans differ — which is the asymmetry a readout
        // that reuses one offset for both axes gets wrong.
        const x = radar * geometry.scale + geometry.offsetX;
        const y = radar * geometry.scale + geometry.offsetY;
        const point = radarPointAt(view, x, y, PLATE, RADAR_SIZE);

        expect(point.x, `x at ${view.zoom}× and ${radar}`).toBeCloseTo(radar, 9);
        expect(point.y, `y at ${view.zoom}× and ${radar}`).toBeCloseTo(radar, 9);
      }
    }
  });

  it("reads the plate's own corner as the map's corner while nothing is panned", () => {
    expect(radarPointAt(plateView(), 0, 0, PLATE, RADAR_SIZE)).toEqual({ x: 0, y: 0 });
  });

  it('answers outside the map for a pointer past its edge, rather than clamping to it', () => {
    const point = radarPointAt(plateView(), PLATE.width + 64, -32, PLATE, RADAR_SIZE);

    expect(point.x).toBeGreaterThan(RADAR_SIZE);
    expect(point.y).toBeLessThan(0);
  });
});

describe('an expanded plate', () => {
  // #315. The canvas stops being square when the reader zooms in, and everything below turns on one
  // choice: the map is fitted to the plate's *short* axis, so the width the expansion wins is more
  // map rather than a bigger one.
  it('draws the map at the same scale as the square it grew out of', () => {
    const atRest = plateGeometry();
    const expanded = plateGeometry();

    readPlateGeometry(plateView(), AT_REST, RADAR_SIZE, atRest);
    readPlateGeometry(plateView(), EXPANDED, RADAR_SIZE, expanded);

    expect(expanded.scale).toBe(atRest.scale);
  });

  it('centres the map on an axis it does not reach across, and pins it there', () => {
    const view = { zoom: 1.25, panX: 0, panY: 0 };
    const out = plateGeometry();
    // 895px of map across 1392px of plate: there is nothing off screen to pan to.
    const centred = (EXPANDED.width - EXPANDED.height * view.zoom) / 2;

    readPlateGeometry(view, EXPANDED, RADAR_SIZE, out);
    expect(out.offsetX).toBeCloseTo(centred, 9);

    panBy(view, -400, 0, EXPANDED);
    readPlateGeometry(view, EXPANDED, RADAR_SIZE, out);
    expect(out.offsetX).toBeCloseTo(centred, 9);
  });

  it('still pans the axis the map does overflow, at the same zoom', () => {
    const view = { zoom: 1.25, panX: 0, panY: 0 };

    panBy(view, 0, -5000, EXPANDED);

    expect(view.panY).toBeCloseTo(EXPANDED.height - EXPANDED.height * view.zoom, 9);
  });

  it('lets the long axis pan once the zoom has filled it', () => {
    const view = { zoom: 2, panX: 0, panY: 0 };

    panBy(view, -5000, 0, EXPANDED);

    // 1432px of map across 1392px of plate, so the far edge comes flush and stops.
    expect(view.panX).toBeCloseTo(EXPANDED.width - EXPANDED.height * view.zoom, 9);
  });

  it('reads a pointer through the same geometry it drew with', () => {
    const views = [
      { zoom: MIN_ZOOM, panX: 0, panY: 0 },
      { zoom: 1.25, panX: -80, panY: -40 },
      { zoom: MAX_ZOOM, panX: -1200, panY: -900 },
    ];

    const geometry = plateGeometry();

    for (const view of views) {
      readPlateGeometry(view, EXPANDED, RADAR_SIZE, geometry);

      for (const radar of [0, 137, 512, 1024]) {
        const point = radarPointAt(
          view,
          radar * geometry.scale + geometry.offsetX,
          radar * geometry.scale + geometry.offsetY,
          EXPANDED,
          RADAR_SIZE,
        );

        expect(point.x, `x at ${view.zoom}× and ${radar}`).toBeCloseTo(radar, 9);
        expect(point.y, `y at ${view.zoom}× and ${radar}`).toBeCloseTo(radar, 9);
      }
    }
  });

  it('draws where the plate is now rather than where the last drag left it', () => {
    // A pan taken on the expanded plate, read back on the square it returns to: the offsets are
    // clamped as they are read, so a stale box cannot put the map off the plate for a frame.
    const view = { zoom: 1.25, panX: 0, panY: 0 };
    const out = plateGeometry();

    panBy(view, 0, -300, EXPANDED);
    readPlateGeometry(view, AT_REST, RADAR_SIZE, out);

    expect(out.offsetY).toBeGreaterThanOrEqual(AT_REST.height - AT_REST.height * view.zoom);
    expect(out.offsetY).toBeLessThanOrEqual(0);
  });
});
