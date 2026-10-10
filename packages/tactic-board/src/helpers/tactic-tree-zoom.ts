export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function clampZoom(zoom: number): number {
  return Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) * 100) / 100;
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(Math.round((zoom + direction * ZOOM_STEP) * 10) / 10);
}

/** Ctrl + wheel: a tenth more or less per notch. */
export function wheelZoom(zoom: number, deltaY: number): number {
  return clampZoom(zoom * (deltaY < 0 ? 1.1 : 0.9));
}

/** The zoom at which a graph of `contentWidth` fills `viewportWidth`, never past life size. */
export function fitZoom(viewportWidth: number, contentWidth: number): number {
  if (contentWidth <= 0 || viewportWidth <= 0) return 1;
  return clampZoom(Math.min(1, Math.floor((viewportWidth / contentWidth) * 20) / 20));
}
