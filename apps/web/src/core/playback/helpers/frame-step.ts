/**
 * The most real time one animation frame may hand the clock.
 *
 * `requestAnimationFrame` is suspended entirely while a tab is hidden, so the first frame back
 * carries the whole interval away as one step — measured at 46 s hidden, which `advanceClock` spent
 * in a single frame and moved the playhead 46 s down the match. The ceiling drops that time on
 * purpose: nothing here is synchronised to wall time, and a review tool that quietly loses the
 * seconds a reader spent elsewhere is behaving correctly. It also covers a stalled main thread,
 * which reports no visibility event at all.
 *
 * 250 ms is four frames a second — far below any rate playback is watchable at, so a frame that
 * hits the ceiling is a frame nobody was reading anyway.
 */
export const MAX_FRAME_MS = 250;

/** Zero on the loop's first frame: there is no previous timestamp to measure from. */
export function frameElapsedMs(previousMs: number, nowMs: number): number {
  if (previousMs === 0) return 0;

  const elapsedMs = nowMs - previousMs;

  return elapsedMs > MAX_FRAME_MS ? MAX_FRAME_MS : elapsedMs;
}
