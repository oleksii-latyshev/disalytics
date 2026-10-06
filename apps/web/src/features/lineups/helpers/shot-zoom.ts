/** How far a crosshair screenshot can be looked into: from fitted to four times that. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** What one press of a zoom button or key does, and where a double-click lands. */
export const ZOOM_STEP = 0.5;
export const DOUBLE_CLICK_ZOOM = 2;

/** How fast a wheel turns into zoom: a notch of 100 is about a fifth. */
const WHEEL_RATE = 0.002;

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * A screenshot's zoom and how far it is moved from the centre of its frame, in CSS px. It is drawn as
 * `translate(x, y) scale(zoom)` around the image's centre.
 */
export interface ZoomView {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export const FITTED: ZoomView = { zoom: MIN_ZOOM, x: 0, y: 0 };

/** `value` held in `[low, high]`; `+ 0` turns a `-0` from a zero-wide range into `0`. */
function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high) + 0;
}

/** The image's box at zoom 1: `object-contain` in its frame. */
export function fittedSize(frame: Size, image: Size): Size {
  if (image.width <= 0 || image.height <= 0) return frame;

  const fit = Math.min(frame.width / image.width, frame.height / image.height);
  return { width: image.width * fit, height: image.height * fit };
}

/** `view` with its zoom in range and moved no further than keeps the image over its frame. */
export function clampView(view: ZoomView, frame: Size, image: Size): ZoomView {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const fitted = fittedSize(frame, image);
  const maxX = Math.max(0, (fitted.width * zoom - frame.width) / 2);
  const maxY = Math.max(0, (fitted.height * zoom - frame.height) / 2);

  return { zoom, x: clamp(view.x, -maxX, maxX), y: clamp(view.y, -maxY, maxY) };
}

/**
 * `view` zoomed to `zoom` so that what is under `point` stays under it. `point` is measured from the
 * frame's centre; without one the zoom is about the centre of the frame.
 */
export function zoomAt(
  view: ZoomView,
  zoom: number,
  frame: Size,
  image: Size,
  point: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
): ZoomView {
  const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = next / view.zoom;

  return clampView(
    {
      zoom: next,
      x: point.x - (point.x - view.x) * ratio,
      y: point.y - (point.y - view.y) * ratio,
    },
    frame,
    image,
  );
}

/** The zoom a wheel's `deltaY` asks for from `zoom`: up is in. */
export function wheelZoom(zoom: number, deltaY: number): number {
  return zoom * Math.exp(-deltaY * WHEEL_RATE);
}

/** Whether the image is bigger than its frame, so a drag has somewhere to move it. */
export function canPan(view: ZoomView, frame: Size, image: Size): boolean {
  const fitted = fittedSize(frame, image);
  return (
    fitted.width * view.zoom > frame.width + 0.5 || fitted.height * view.zoom > frame.height + 0.5
  );
}
