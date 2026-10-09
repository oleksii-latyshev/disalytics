import type { RadarColors } from '@disa/plate';
import { plateView, SQUARE_PLATE } from '@disa/plate';
import { describe, expect, it } from 'vitest';
import { type HeatPicture, overlayPicture } from '../helpers/heat-picture';
import { heatRamps, rampIndex } from '../helpers/heat-ramp';
import { alphaOf, curved, curveTable, FAINT_WEIGHT, hatchFactor } from '../helpers/heat-shade';

describe('alphaOf', () => {
  it('is transparent at the faint end and opaque only near the hot ceiling', () => {
    expect(alphaOf(0)).toBe(0);
    expect(alphaOf(FAINT_WEIGHT)).toBeLessThan(15);
    expect(alphaOf(0.2)).toBeLessThan(alphaOf(1) / 3);
    expect(alphaOf(1)).toBeGreaterThan(215);
    expect(alphaOf(1)).toBeLessThanOrEqual(255);
  });

  it('only ever rises with weight', () => {
    let last = 0;
    for (let weight = 0; weight <= 1; weight += 0.01) {
      expect(alphaOf(weight)).toBeGreaterThanOrEqual(last);
      last = alphaOf(weight);
    }
  });

  it('clamps what is outside 0..1', () => {
    expect(alphaOf(-3)).toBe(alphaOf(0));
    expect(alphaOf(7)).toBe(alphaOf(1));
  });
});

describe('curved', () => {
  it('lifts a modest weight when the curve is below one', () => {
    expect(curved(curveTable(0.5), 0.25)).toBeCloseTo(0.5, 2);
    expect(curved(curveTable(0.5), 2)).toBe(1);
  });
});

describe('hatchFactor', () => {
  it('stripes on the diagonal: whole on a stripe, a little in the gap', () => {
    expect(hatchFactor(0, 0)).toBe(1);
    expect(hatchFactor(3, 0)).toBeLessThan(1);
    expect(hatchFactor(2, 1)).toBe(hatchFactor(3, 0));
    expect(hatchFactor(6, 0)).toBe(1);
  });
});

describe('the field ramp', () => {
  const field = heatRamps({ low: '#2fbf71', high: '#f2f06b', second: '#ff6ad5' }).field;
  const at = (weight: number) => {
    const from = rampIndex(weight);

    return [field[from] ?? 0, field[from + 1] ?? 0, field[from + 2] ?? 0];
  };

  it('is the hot colour, not white, for ordinary hot ground', () => {
    const [red = 0, green = 0, blue = 255] = at(0.86);

    expect(Math.abs(red - 0xf2)).toBeLessThan(4);
    expect(Math.abs(green - 0xf0)).toBeLessThan(4);
    expect(blue).toBeLessThan(160);
  });

  it('keeps white for the last sliver', () => {
    expect(at(1)).toEqual([255, 255, 255]);
    expect(at(0.93)[2]).toBeLessThan(220);
  });
});

describe('overlayPicture', () => {
  const colors = {} as RadarColors;
  const view = { current: plateView() };

  function drawn(shown: { first: boolean; second: boolean }): string[] {
    const calls: string[] = [];
    const layerOf =
      (name: string): HeatPicture =>
      () =>
      () => {
        calls.push(name);
      };

    const layer = overlayPicture(layerOf('first'), layerOf('second'))(colors, {
      plate: SQUARE_PLATE,
      view,
      shown,
    });
    layer({} as CanvasRenderingContext2D, { width: 1, height: 1 });

    return calls;
  }

  it('draws the first under the second', () => {
    expect(drawn({ first: true, second: true })).toEqual(['first', 'second']);
  });

  it('leaves out a player who is hidden', () => {
    expect(drawn({ first: false, second: true })).toEqual(['second']);
    expect(drawn({ first: true, second: false })).toEqual(['first']);
    expect(drawn({ first: false, second: false })).toEqual([]);
  });
});
