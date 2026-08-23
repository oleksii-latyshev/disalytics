import { describe, expect, it } from 'vitest';
import { type CanvasSize, inBand, type Layer } from '../helpers/canvas';

const PLATE: CanvasSize = { width: 400, height: 200 };

interface Call {
  readonly name: string;
  readonly args: readonly number[];
}

/**
 * Only what `inBand` itself touches. A layer is handed a real context in the product, and what this
 * asserts is the frame it is handed — the translation, the clip and the size it is told it has.
 */
function newContext(calls: Call[]): CanvasRenderingContext2D {
  const record =
    (name: string) =>
    (...args: number[]) =>
      calls.push({ name, args });

  return {
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    beginPath: record('beginPath'),
    rect: record('rect'),
    clip: record('clip'),
  } as unknown as CanvasRenderingContext2D;
}

describe('inBand', () => {
  it('translates to the band and tells the layer the band is its whole surface', () => {
    const calls: Call[] = [];
    let given: CanvasSize | null = null;

    const layer: Layer = (_, size) => {
      given = size;
    };

    inBand(layer, { top: 0.25, height: 0.5 })(newContext(calls), PLATE);

    expect(given).toEqual({ width: 400, height: 100 });
    expect(calls.find((call) => call.name === 'translate')?.args).toEqual([0, 50]);
    expect(calls.find((call) => call.name === 'rect')?.args).toEqual([0, 0, 400, 100]);
  });

  it('clips before the layer draws and restores after it', () => {
    const calls: Call[] = [];
    const layer: Layer = (context) => {
      (context as unknown as { save: () => void }).save();
    };

    inBand(layer, { top: 0, height: 1 })(newContext(calls), PLATE);

    expect(calls.map((call) => call.name)).toEqual([
      'save',
      'translate',
      'beginPath',
      'rect',
      'clip',
      'save',
      'restore',
    ]);
  });

  it('does not run a layer given no height at all', () => {
    const calls: Call[] = [];
    let ran = false;

    inBand(
      () => {
        ran = true;
      },
      { top: 0, height: 0 },
    )(newContext(calls), PLATE);

    expect(ran).toBe(false);
    expect(calls).toEqual([]);
  });
});
