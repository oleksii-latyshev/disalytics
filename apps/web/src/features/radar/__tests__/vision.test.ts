import { describe, expect, it } from 'vitest';
import { visionRadius, visionWedge } from '../helpers/vision';

interface Recorder {
  context: CanvasRenderingContext2D;
  readonly calls: string[];
  /** Every gradient this context has been asked to build, newest last. */
  readonly gradients: { radius: number; stops: string[] }[];
  alpha: number;
  fill: unknown;
}

/**
 * Enough of a 2D context to record what the wedge asks for. `createRadialGradient` is the call
 * under test: the cache exists so that it happens once across a match rather than once a frame.
 */
function newRecorder(): Recorder {
  const calls: string[] = [];
  const gradients: { radius: number; stops: string[] }[] = [];

  // Written to by the setters below, so it has to be the object the caller holds rather than a
  // copy of it.
  const recorder: Recorder = {
    calls,
    gradients,
    alpha: 1,
    fill: null as unknown,
    context: null as unknown as CanvasRenderingContext2D,
  };

  const context = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fill'),
    translate: (x: number, y: number) => calls.push(`translate(${x},${y})`),
    moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
    arc: (x: number, y: number, radius: number, from: number, to: number) =>
      calls.push(`arc(${x},${y},${radius},${from.toFixed(4)},${to.toFixed(4)})`),
    createRadialGradient: (
      _x0: number,
      _y0: number,
      _r0: number,
      x1: number,
      y1: number,
      r1: number,
    ) => {
      const stops: string[] = [];
      gradients.push({ radius: r1, stops });
      calls.push(`createRadialGradient(${x1},${y1},${r1})`);

      return { addColorStop: (_offset: number, color: string) => stops.push(color) };
    },
    set globalAlpha(value: number) {
      recorder.alpha = value;
    },
    set fillStyle(value: unknown) {
      recorder.fill = value;
    },
  } as unknown as CanvasRenderingContext2D;

  recorder.context = context;

  return recorder;
}

const OVERVIEW = { scale: 5 } as Parameters<typeof visionRadius>[0];

describe('visionRadius', () => {
  it('converts the cone reach from world units to device pixels', () => {
    expect(visionRadius(OVERVIEW, 1)).toBe(200);
    expect(visionRadius(OVERVIEW, 2)).toBe(400);
  });
});

describe('visionWedge', () => {
  it('builds its gradient once and reuses it across frames', () => {
    const recorder = newRecorder();
    const wedge = visionWedge();

    for (let frame = 0; frame < 60; frame++) {
      wedge(recorder.context, frame, frame * 2, frame / 10, 200, '#ct0000');
    }

    expect(recorder.gradients).toHaveLength(1);
  });

  it('rebuilds it when the canvas has changed the radius, and not otherwise', () => {
    const recorder = newRecorder();
    const wedge = visionWedge();

    wedge(recorder.context, 0, 0, 0, 200, '#ct0000');
    wedge(recorder.context, 0, 0, 0, 200, '#ct0000');
    wedge(recorder.context, 0, 0, 0, 400, '#ct0000');
    wedge(recorder.context, 0, 0, 0, 400, '#ct0000');

    expect(recorder.gradients.map((gradient) => gradient.radius)).toEqual([200, 400]);
  });

  it('rebuilds it when the reader has changed side or palette', () => {
    const recorder = newRecorder();
    const wedge = visionWedge();

    wedge(recorder.context, 0, 0, 0, 200, '#ct0000');
    wedge(recorder.context, 0, 0, 0, 200, '#t00000');
    wedge(recorder.context, 0, 0, 0, 200, '#t00000');

    expect(recorder.gradients).toHaveLength(2);
    expect(recorder.gradients.map((gradient) => gradient.stops)).toEqual([
      ['#ct0000', 'transparent'],
      ['#t00000', 'transparent'],
    ]);
  });

  it('paints the cone around the origin under a translation, so the cache can survive a move', () => {
    const recorder = newRecorder();

    visionWedge()(recorder.context, 40, 90, 0, 200, '#ct0000');

    expect(recorder.calls).toEqual([
      'save',
      'translate(40,90)',
      'createRadialGradient(0,0,200)',
      'beginPath',
      'moveTo(0,0)',
      `arc(0,0,200,${(-Math.PI / 4).toFixed(4)},${(Math.PI / 4).toFixed(4)})`,
      'closePath',
      'fill',
      'restore',
    ]);
    expect(recorder.alpha).toBe(0.15);
  });

  it('draws nothing at all where the plate has no room for a cone', () => {
    const recorder = newRecorder();

    visionWedge()(recorder.context, 0, 0, 0, 0, '#ct0000');

    expect(recorder.calls).toEqual([]);
    expect(recorder.gradients).toEqual([]);
  });
});
