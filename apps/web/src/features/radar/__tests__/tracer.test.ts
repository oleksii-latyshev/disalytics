import { describe, expect, it } from 'vitest';
import { tracerLength, tracerStroke } from '../helpers/tracer';

interface Recorder {
  readonly context: CanvasRenderingContext2D;
  readonly gradients: number;
  readonly strokes: number;
  readonly lines: { readonly from: number; readonly to: number }[];
  readonly transforms: string[];
}

function newRecorder(): Recorder {
  const state = { gradients: 0, strokes: 0 };
  const lines: { from: number; to: number }[] = [];
  const transforms: string[] = [];
  let from = 0;

  const context = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    translate: (x: number, y: number) => transforms.push(`translate ${x} ${y}`),
    rotate: (angle: number) => transforms.push(`rotate ${angle}`),
    moveTo: (x: number) => {
      from = x;
    },
    lineTo: (x: number) => lines.push({ from, to: x }),
    stroke: () => {
      state.strokes++;
    },
    createLinearGradient: () => {
      state.gradients++;
      return { addColorStop: () => {} } as unknown as CanvasGradient;
    },
    set strokeStyle(_value: string | CanvasGradient) {},
    set lineWidth(_value: number) {},
    set globalAlpha(_value: number) {},
  } as unknown as CanvasRenderingContext2D;

  return {
    context,
    lines,
    transforms,
    get gradients() {
      return state.gradients;
    },
    get strokes() {
      return state.strokes;
    },
  };
}

// `scale` is the only field the reach is derived from, and a whole overview here would be forty
// lines of Valve's constants standing in for one number. de_dust2's, so the arithmetic below is the
// same arithmetic `docs/PARSER.md` §22 quotes.
const OVERVIEW = { scale: 4.4 } as Parameters<typeof tracerLength>[0];

describe('tracerLength', () => {
  it('is a world length, so the same ground is covered at every zoom', () => {
    // 512 units on a map drawn at 4.4 units to the image pixel is 116.36 image pixels, and the
    // plate's own scale is what turns those into device pixels.
    expect(tracerLength(OVERVIEW, 1)).toBeCloseTo(512 / 4.4, 5);
    expect(tracerLength(OVERVIEW, 2)).toBeCloseTo((512 / 4.4) * 2, 5);
  });
});

describe('tracerStroke', () => {
  it('builds its gradient once and reuses it across frames', () => {
    const recorder = newRecorder();
    const tracer = tracerStroke();

    for (let frame = 0; frame < 3; frame++) {
      tracer(recorder.context, 10, 20, 0, 18, 80, '#ffffff', 1);
    }

    expect(recorder.strokes).toBe(3);
    expect(recorder.gradients).toBe(1);
  });

  it('rebuilds it when the zoom changes its length, and not otherwise', () => {
    const recorder = newRecorder();
    const tracer = tracerStroke();

    tracer(recorder.context, 0, 0, 0, 18, 80, '#ffffff', 1);
    tracer(recorder.context, 0, 0, 1, 18, 80, '#ffffff', 0.5);
    expect(recorder.gradients).toBe(1);

    tracer(recorder.context, 0, 0, 0, 18, 160, '#ffffff', 1);
    expect(recorder.gradients).toBe(2);

    tracer(recorder.context, 0, 0, 0, 18, 160, '#000000', 1);
    expect(recorder.gradients).toBe(3);
  });

  it('strokes from the origin so the gradient spans exactly the ray', () => {
    const recorder = newRecorder();
    const tracer = tracerStroke();

    tracer(recorder.context, 10, 20, 0, 18, 80, '#ffffff', 1);

    expect(recorder.lines).toEqual([{ from: 0, to: 80 }]);
    // To the token, around to the shot's own angle, then out past the needle.
    expect(recorder.transforms).toEqual(['translate 10 20', 'rotate 0', 'translate 21 0']);
  });

  it('draws nothing for a spent shot or a plate with no room', () => {
    const recorder = newRecorder();
    const tracer = tracerStroke();

    tracer(recorder.context, 0, 0, 0, 18, 80, '#ffffff', 0);
    tracer(recorder.context, 0, 0, 0, 18, 0, '#ffffff', 1);

    expect(recorder.strokes).toBe(0);
  });
});
