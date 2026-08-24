import type { CanvasSize } from '@/core/renderer';
import { TOKEN_MAX_RADIUS_PX, TOKEN_MIN_RADIUS_PX, TOKEN_RADIUS_PX } from './tokens';

/**
 * The plate at rest shows the whole map, so there is nothing below 1× to look at — the cell is
 * already sized to fit it (DESIGN.md §5.1) and zooming out would only add margin. The ceiling is
 * where a bombsite fills the plate; past it the radar image is being enlarged rather than resolved,
 * because the asset is 1024px square whatever the plate does.
 */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** One press of `+`, one notch of the wheel — a ratio, so every step feels the same size. */
export const ZOOM_STEP = 1.25;

/**
 * How the reader is looking at the plate. Zoom is a *view* state, not playback state: it survives
 * scrubbing, a round jump and a pause, and nothing but the reader moves it — DESIGN.md §6.3.
 *
 * Mutable and read inside the draw, for the reason `hoveredKillRef` is: a pan is a repaint of the
 * layers that already exist, never a rebuild of them, and hard rule 4 keeps React off that path.
 */
export interface PlateView {
  zoom: number;
  /** Where the map's top-left corner sits on the canvas, in CSS pixels. Zero at rest. */
  panX: number;
  panY: number;
}

export function plateView(): PlateView {
  return { zoom: MIN_ZOOM, panX: 0, panY: 0 };
}

export function resetView(view: PlateView): void {
  view.zoom = MIN_ZOOM;
  view.panX = 0;
  view.panY = 0;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;

  return value > max ? max : value;
}

/**
 * Pan far enough that the map leaves the plate and the reader is looking at nothing. The map covers
 * `extent * zoom`, so the corner may travel from `extent * (1 - zoom)` — the far edge flush with the
 * plate's — up to zero, and at 1× that range collapses and the map is pinned.
 */
function clampPan(pan: number, extent: number, zoom: number): number {
  return clamp(pan, extent * (1 - zoom), 0);
}

export function panBy(view: PlateView, dx: number, dy: number, size: CanvasSize): void {
  view.panX = clampPan(view.panX + dx, size.width, view.zoom);
  view.panY = clampPan(view.panY + dy, size.height, view.zoom);
}

/**
 * Zoom about a point on the canvas, so whatever is under the pointer stays under it. Anchoring on
 * the plate's centre instead is the thing that makes a zoom feel broken — the reader is looking at a
 * duel, and the duel is what has to hold still.
 */
export function zoomAbout(view: PlateView, factor: number, x: number, y: number, size: CanvasSize) {
  const next = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = next / view.zoom;

  view.zoom = next;
  view.panX = clampPan(x - (x - view.panX) * ratio, size.width, next);
  view.panY = clampPan(y - (y - view.panY) * ratio, size.height, next);
}

/** Zoom on the plate's own centre, which is what a keypress and the `+`/`−` pair have to use. */
export function zoomByStep(view: PlateView, factor: number, size: CanvasSize): void {
  zoomAbout(view, factor, size.width / 2, size.height / 2, size);
}

/**
 * What a layer needs to put a radar-image coordinate on the canvas. Written into the caller's own
 * object rather than returned as a fresh one: this is read once per layer per animation frame, and
 * nothing on the way to the canvas allocates.
 */
export interface PlateGeometry {
  /** CSS pixels per radar-image pixel, the reader's zoom included. */
  scale: number;
  offsetX: number;
  offsetY: number;
  /** 16px at 1×, growing with the plate but never past what §6.1 allows it. */
  tokenRadius: number;
}

export function plateGeometry(): PlateGeometry {
  return { scale: 0, offsetX: 0, offsetY: 0, tokenRadius: TOKEN_RADIUS_PX };
}

export function readPlateGeometry(
  view: PlateView,
  size: CanvasSize,
  radarImageSize: number,
  out: PlateGeometry,
): void {
  out.scale = (size.width / radarImageSize) * view.zoom;
  out.offsetX = view.panX;
  out.offsetY = view.panY;
  out.tokenRadius = clamp(TOKEN_RADIUS_PX * view.zoom, TOKEN_MIN_RADIUS_PX, TOKEN_MAX_RADIUS_PX);
}

/**
 * Where the visible plate falls in the coordinates a layer draws in, once the pan has been applied
 * to the context. The label placer keeps names inside this rather than inside the canvas, or a
 * panned plate would stack every name against an edge that is no longer on screen.
 */
export interface PlateBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function plateBounds(): PlateBounds {
  return { left: 0, top: 0, width: 0, height: 0 };
}

export function readPlateBounds(geometry: PlateGeometry, size: CanvasSize, out: PlateBounds): void {
  out.left = -geometry.offsetX;
  out.top = -geometry.offsetY;
  out.width = size.width;
  out.height = size.height;
}
