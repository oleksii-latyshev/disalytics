import type { GrenadeType } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  BODY_PART_COUNT,
  bodyParts,
  COUNTDOWN_MIN_RADIUS_PX,
  countdownLabels,
  drawFireBody,
  drawRemainingSeconds,
  drawSmokeBody,
} from '../helpers/utility-body';

interface Recorder {
  readonly context: CanvasRenderingContext2D;
  readonly arcs: { x: number; y: number; r: number }[];
  readonly fills: number;
  readonly paths: number;
  readonly texts: string[];
}

function newRecorder(): Recorder {
  const arcs: { x: number; y: number; r: number }[] = [];
  const texts: string[] = [];
  const state = { fills: 0, paths: 0 };

  const context = {
    save: () => {},
    restore: () => {},
    beginPath: () => {
      state.paths++;
    },
    moveTo: () => {},
    arc: (x: number, y: number, r: number) => arcs.push({ x, y, r }),
    fill: () => {
      state.fills++;
    },
    strokeText: (text: string) => texts.push(`stroke:${text}`),
    fillText: (text: string) => texts.push(`fill:${text}`),
    set fillStyle(_value: string) {},
    set strokeStyle(_value: string) {},
    set globalAlpha(_value: number) {},
    set lineWidth(_value: number) {},
    set lineJoin(_value: string) {},
    set font(_value: string) {},
    set textAlign(_value: string) {},
    set textBaseline(_value: string) {},
  } as unknown as CanvasRenderingContext2D;

  return {
    context,
    arcs,
    texts,
    get fills() {
      return state.fills;
    },
    get paths() {
      return state.paths;
    },
  };
}

const LABELS = countdownLabels('s');
const SMOKE: { readonly type: GrenadeType } = { type: 'smokegrenade' };
const FIRE: { readonly type: GrenadeType } = { type: 'molotov' };

describe('bodyParts', () => {
  it('lays out every grenade, whether or not its type has a body', () => {
    const parts = bodyParts([SMOKE, FIRE, { type: 'flashbang' }]);

    expect(parts.length).toBe(3 * BODY_PART_COUNT * 3);
  });

  it('is the same shape every time it is built, which is what a replay needs', () => {
    const first = bodyParts([SMOKE, FIRE]);
    const second = bodyParts([SMOKE, FIRE]);

    expect([...first]).toEqual([...second]);
  });

  it('gives two grenades of one type two different shapes', () => {
    const parts = bodyParts([SMOKE, SMOKE]);
    const stride = BODY_PART_COUNT * 3;

    expect([...parts.slice(0, stride)]).not.toEqual([...parts.slice(stride)]);
  });

  it('keeps every part inside the body it belongs to', () => {
    const parts = bodyParts([SMOKE, FIRE]);

    for (let index = 0; index < 2; index++) {
      for (let part = 0; part < BODY_PART_COUNT; part++) {
        const at = (index * BODY_PART_COUNT + part) * 3;
        const dx = parts[at] ?? 0;
        const dy = parts[at + 1] ?? 0;
        const radius = parts[at + 2] ?? 0;

        expect(radius).toBeGreaterThan(0);
        // A part's far edge, as a fraction of the body's own radius. Beyond ~1.3 the body stops
        // reading as the area the model says it covers.
        expect(Math.sqrt(dx * dx + dy * dy) + radius).toBeLessThan(1.3);
      }
    }
  });
});

describe('drawSmokeBody', () => {
  it('is one filled path, however many parts it is made of', () => {
    const recorder = newRecorder();
    drawSmokeBody(recorder.context, 10, 20, 30, 0.3, '#smoke', bodyParts([SMOKE]), 0);

    expect(recorder.arcs.length).toBe(BODY_PART_COUNT);
    expect(recorder.paths).toBe(1);
    expect(recorder.fills).toBe(1);
  });

  it('scales with the extent it is given, so a filling cloud is a smaller one', () => {
    const parts = bodyParts([SMOKE]);
    const small = newRecorder();
    const large = newRecorder();

    drawSmokeBody(small.context, 0, 0, 10, 0.3, '#smoke', parts, 0);
    drawSmokeBody(large.context, 0, 0, 20, 0.3, '#smoke', parts, 0);

    expect(small.arcs[0]?.r).toBeCloseTo((large.arcs[0]?.r ?? 0) / 2, 5);
  });

  it('draws nothing for a body with no size or no ink', () => {
    const recorder = newRecorder();
    drawSmokeBody(recorder.context, 0, 0, 0, 0.3, '#smoke', bodyParts([SMOKE]), 0);
    drawSmokeBody(recorder.context, 0, 0, 30, 0, '#smoke', bodyParts([SMOKE]), 0);

    expect(recorder.fills).toBe(0);
  });
});

describe('drawFireBody', () => {
  it('is separate patches rather than one area, which is what tells it from a cloud', () => {
    const recorder = newRecorder();
    drawFireBody(recorder.context, 10, 20, 30, 0.25, '#fire', bodyParts([SMOKE, FIRE]), 1);

    expect(recorder.arcs.length).toBe(BODY_PART_COUNT);
    expect(recorder.paths).toBe(BODY_PART_COUNT);
    expect(recorder.fills).toBe(BODY_PART_COUNT);
  });

  it('draws nothing for an index the layout does not hold', () => {
    const recorder = newRecorder();
    drawFireBody(recorder.context, 0, 0, 30, 0.25, '#fire', bodyParts([FIRE]), 4);

    expect(recorder.fills).toBe(0);
  });
});

describe('countdownLabels', () => {
  it('composes every reading a body can show, so a draw builds no string', () => {
    const labels = countdownLabels('с');

    expect(labels[0]).toBe('0с');
    expect(labels[18]).toBe('18с');
    // A smoke runs about 18 s and a fire 7, so the table reaches well past either.
    expect(labels.length).toBeGreaterThan(20);
  });
});

describe('drawRemainingSeconds', () => {
  it('states the whole seconds and its unit, haloed, in the middle of the body', () => {
    const recorder = newRecorder();
    drawRemainingSeconds(recorder.context, 10, 20, 30, 7, LABELS, '#ink', '#halo', '13px mono');

    expect(recorder.texts).toEqual(['stroke:7s', 'fill:7s']);
  });

  it('says nothing where the body has no room for it', () => {
    const recorder = newRecorder();
    drawRemainingSeconds(
      recorder.context,
      0,
      0,
      COUNTDOWN_MIN_RADIUS_PX - 1,
      7,
      LABELS,
      '#ink',
      '#halo',
      '13px mono',
    );

    expect(recorder.texts).toEqual([]);
  });

  it('says nothing for a reading the table does not hold', () => {
    const recorder = newRecorder();
    drawRemainingSeconds(recorder.context, 0, 0, 30, 9_999, LABELS, '#ink', '#halo', '13px mono');

    expect(recorder.texts).toEqual([]);
  });

  it('says nothing rather than a zero once the body is spent', () => {
    const recorder = newRecorder();
    drawRemainingSeconds(recorder.context, 0, 0, 30, 0, LABELS, '#ink', '#halo', '13px mono');

    expect(recorder.texts).toEqual([]);
  });
});
