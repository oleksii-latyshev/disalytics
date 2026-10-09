import { RADAR_IMAGE_SIZE } from '@disa/map-data';
import type { CanvasSize } from '../../renderer/helpers/canvas';
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

/** What the plate holds, in radar pixels — the layout's composite, or the whole square image. */
export interface PlateSize {
  readonly width: number;
  readonly height: number;
}

export const SQUARE_PLATE: PlateSize = { width: RADAR_IMAGE_SIZE, height: RADAR_IMAGE_SIZE };

/**
 * Canvas pixels per radar pixel at 1×: the plate's content fits whole on whichever axis binds it,
 * which is what keeps the scale continuous when a zoomed plate takes the whole stage.
 */
function fitScale(size: CanvasSize, plate: PlateSize): number {
  return Math.min(size.width / plate.width, size.height / plate.height);
}

/**
 * Where the map's corner sits on one axis. A map longer than the plate may travel until its far
 * edge is flush with the plate's; one that does not reach across the axis is centred on it and the
 * reader cannot move it — the rule that pins a plate at rest, arrived at from the other side. An
 * expanded plate is in the second case on its long axis until the zoom has filled it.
 */
function offsetOn(pan: number, length: number, extent: number): number {
  return extent >= length ? clamp(pan, length - extent, 0) : (length - extent) / 2;
}

export function panBy(
  view: PlateView,
  dx: number,
  dy: number,
  size: CanvasSize,
  plate: PlateSize,
): void {
  const scale = fitScale(size, plate) * view.zoom;

  view.panX = offsetOn(view.panX + dx, size.width, plate.width * scale);
  view.panY = offsetOn(view.panY + dy, size.height, plate.height * scale);
}

/**
 * Zoom about a point on the canvas, so whatever is under the pointer stays under it. Anchoring on
 * the plate's centre instead is the thing that makes a zoom feel broken — the reader is looking at a
 * duel, and the duel is what has to hold still.
 */
export function zoomAbout(
  view: PlateView,
  factor: number,
  x: number,
  y: number,
  size: CanvasSize,
  plate: PlateSize,
) {
  const next = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = next / view.zoom;

  const scale = fitScale(size, plate) * next;

  view.zoom = next;
  view.panX = offsetOn(x - (x - view.panX) * ratio, size.width, plate.width * scale);
  view.panY = offsetOn(y - (y - view.panY) * ratio, size.height, plate.height * scale);
}

/** Zoom on the plate's own centre, which is what a keypress and the `+`/`−` pair have to use. */
export function zoomByStep(
  view: PlateView,
  factor: number,
  size: CanvasSize,
  plate: PlateSize,
): void {
  zoomAbout(view, factor, size.width / 2, size.height / 2, size, plate);
}

/**
 * The plate coordinate under a point on the canvas — `readPlateGeometry` run backwards, so a
 * readout answers for the world the layers actually drew rather than for the plate at rest.
 *
 * A fresh object, unlike everything below it: this answers a pointer event, and a pointer event is
 * not the frame path.
 */
export function radarPointAt(
  view: PlateView,
  x: number,
  y: number,
  size: CanvasSize,
  plate: PlateSize,
): { x: number; y: number } {
  const scale = fitScale(size, plate) * view.zoom;

  return {
    x: (x - offsetOn(view.panX, size.width, plate.width * scale)) / scale,
    y: (y - offsetOn(view.panY, size.height, plate.height * scale)) / scale,
  };
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
  plate: PlateSize,
  out: PlateGeometry,
): void {
  const scale = fitScale(size, plate) * view.zoom;

  // The offsets are read through the same clamp the pan is written through, so a plate that changed
  // shape under a stale pan — a window resized while zoomed, an expansion — draws the map where it
  // belongs on the axis it now has rather than where the last drag left it.
  out.scale = scale;
  out.offsetX = offsetOn(view.panX, size.width, plate.width * scale);
  out.offsetY = offsetOn(view.panY, size.height, plate.height * scale);
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
