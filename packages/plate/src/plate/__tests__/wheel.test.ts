import { describe, expect, it } from 'vitest';
import { ZOOM_STEP } from '../helpers/view';
import { type WheelInput, wheelIntent } from '../helpers/wheel';

const wheel = (input: Partial<WheelInput>): WheelInput => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  ...input,
});

describe('wheelIntent', () => {
  it('zooms a pinch in proportion to its delta', () => {
    const small = wheelIntent(wheel({ ctrlKey: true, deltaY: -2 }));
    const larger = wheelIntent(wheel({ ctrlKey: true, deltaY: -8 }));

    expect(small.kind).toBe('zoom');
    expect(larger.kind).toBe('zoom');
    if (small.kind !== 'zoom' || larger.kind !== 'zoom') return;

    expect(small.factor).toBeGreaterThan(1);
    expect(small.factor).toBeLessThan(larger.factor);
    expect(wheelIntent(wheel({ ctrlKey: true, deltaY: 4 }))).toMatchObject({ kind: 'zoom' });
  });

  it('never lets one pinch event be bigger than a step', () => {
    expect(wheelIntent(wheel({ ctrlKey: true, deltaY: -500 }))).toEqual({
      kind: 'zoom',
      factor: ZOOM_STEP,
    });
    expect(wheelIntent(wheel({ ctrlKey: true, deltaY: 500 }))).toEqual({
      kind: 'zoom',
      factor: 1 / ZOOM_STEP,
    });
  });

  it('zooms a mouse notch by exactly one step', () => {
    // Chromium on Windows and macOS: a notch is ±120 in `wheelDeltaY`, whatever `deltaY` is.
    expect(wheelIntent(wheel({ deltaY: 100, wheelDeltaY: -120 }))).toEqual({
      kind: 'zoom',
      factor: 1 / ZOOM_STEP,
    });
    expect(wheelIntent(wheel({ deltaY: -4, wheelDeltaY: 120 }))).toEqual({
      kind: 'zoom',
      factor: ZOOM_STEP,
    });
    // Firefox: no `wheelDeltaY`, and a notch in lines.
    expect(wheelIntent(wheel({ deltaY: 3, deltaMode: 1 }))).toEqual({
      kind: 'zoom',
      factor: 1 / ZOOM_STEP,
    });
  });

  it('pans a two-finger scroll with the fingers', () => {
    expect(wheelIntent(wheel({ deltaY: 12, wheelDeltaY: -36 }))).toEqual({
      kind: 'pan',
      dx: -0,
      dy: -12,
    });
    expect(wheelIntent(wheel({ deltaX: -5, deltaY: 1, wheelDeltaY: 120 }))).toEqual({
      kind: 'pan',
      dx: 5,
      dy: -1,
    });
    expect(wheelIntent(wheel({ deltaY: 7 }))).toMatchObject({ kind: 'pan' });
  });
});
