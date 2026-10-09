import { ZOOM_STEP } from './view';

/** The parts of a `WheelEvent` the decision reads, so it can be tested without a DOM. */
export interface WheelInput {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly ctrlKey: boolean;
  /** Non-standard, and absent in Firefox. Chromium and WebKit send it. */
  readonly wheelDeltaY?: number | undefined;
}

export type WheelIntent =
  | { readonly kind: 'zoom'; readonly factor: number }
  | { readonly kind: 'pan'; readonly dx: number; readonly dy: number };

/**
 * How fast a pinch zooms: `exp(-deltaY × this)`. A trackpad pinch arrives as `ctrlKey` wheels of a
 * few pixels each, dozens a second, so a fixed step per event is what made it lurch — #381.
 */
const PINCH_SENSITIVITY = 0.01;

/**
 * A trackpad scroll, as opposed to a mouse wheel. There is no field that says so; this is the
 * heuristic browsers leave: a sideways component is a trackpad, and where `wheelDeltaY` exists a
 * trackpad reports it as exactly −3 × `deltaY` while a notch reports ±120 whatever `deltaY` is.
 * Firefox has no `wheelDeltaY` and reports a mouse notch in lines, so pixels there mean a trackpad.
 */
function isTrackpadScroll(input: WheelInput): boolean {
  if (input.deltaX !== 0) return true;
  if (input.wheelDeltaY !== undefined && input.wheelDeltaY !== 0) {
    return input.wheelDeltaY === -3 * input.deltaY;
  }

  return input.deltaMode === 0;
}

/**
 * What a wheel over the plate asks for. A pinch zooms in proportion to its delta, capped at one
 * step so a `ctrl`+notch is no bigger than a notch; a mouse notch zooms one step; a two-finger
 * scroll pans — the content follows the fingers, so the pan is the delta reversed.
 */
export function wheelIntent(input: WheelInput): WheelIntent {
  if (input.ctrlKey) {
    const factor = Math.exp(-input.deltaY * PINCH_SENSITIVITY);

    return { kind: 'zoom', factor: Math.min(Math.max(factor, 1 / ZOOM_STEP), ZOOM_STEP) };
  }

  if (isTrackpadScroll(input)) return { kind: 'pan', dx: -input.deltaX, dy: -input.deltaY };

  return { kind: 'zoom', factor: input.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP };
}
