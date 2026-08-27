/**
 * `docs/DESIGN.md` §5.4's quadrant, as a fraction of the viewport rather than a box in pixels: the
 * cluster is an ambient reveal and not a target, and a corner the reader has to aim at is worse
 * than one that is always lit.
 */
const QUADRANT = 0.5;

/** §9.3's bottom edge, and the one measurement that section gives in pixels. */
const BOTTOM_EDGE_PX = 80;

/** How long the pointer must hold still before §9.3 takes the timeline block away. */
export const STILLNESS_MS = 3_000;

/** Whether the pointer is where §5.4's cluster rises out of `--ink-faint`. */
export function isInTopRightQuadrant(x: number, y: number, width: number, height: number): boolean {
  return x >= width * QUADRANT && y <= height * QUADRANT;
}

/** Whether the pointer is in the band that brings §5.5's block back. */
export function isOverBottomEdge(y: number, height: number): boolean {
  return y >= height - BOTTOM_EDGE_PX;
}

/** Whether the pointer has been still long enough for the block to leave. */
export function isStill(now: number, lastMoveAt: number): boolean {
  return now - lastMoveAt >= STILLNESS_MS;
}
