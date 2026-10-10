import { describe, expect, it } from 'vitest';
import { frameElapsedMs, MAX_FRAME_MS } from '../helpers/frame-step';

describe('frameElapsedMs', () => {
  it("costs nothing on the loop's first frame", () => {
    expect(frameElapsedMs(0, 12_345)).toBe(0);
  });

  it('passes an ordinary frame through untouched', () => {
    expect(frameElapsedMs(1000, 1008)).toBe(8);
  });

  it('keeps a frame that lands exactly on the ceiling', () => {
    expect(frameElapsedMs(1000, 1000 + MAX_FRAME_MS)).toBe(MAX_FRAME_MS);
  });

  it('caps the interval a hidden tab hands back', () => {
    expect(frameElapsedMs(233_901, 279_960)).toBe(MAX_FRAME_MS);
  });

  it('caps a stalled main thread the same way, with no visibility event involved', () => {
    expect(frameElapsedMs(1000, 3400)).toBe(MAX_FRAME_MS);
  });
});
