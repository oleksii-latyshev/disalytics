import { MAP_OVERVIEWS, RADAR_IMAGE_SIZE } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { DIFFERENCE_CUT, heatDifference, routesOverlap } from '../helpers/heat-difference';
import {
  HEAT_GRID,
  type HeatField,
  type HeatSource,
  heatFieldOf,
  heatRingsOf,
} from '../helpers/heat-field';
import { heatRamps, RAMP_STEPS, rampIndex } from '../helpers/heat-ramp';

const dust2 = MAP_OVERVIEWS.de_dust2;

function worldAtBin(binX: number, binY: number): { x: number; y: number } {
  const pixels = (RADAR_IMAGE_SIZE / HEAT_GRID) * 0.5;

  return {
    x: dust2.posX + ((binX * RADAR_IMAGE_SIZE) / HEAT_GRID) * dust2.scale + pixels * dust2.scale,
    y: dust2.posY - ((binY * RADAR_IMAGE_SIZE) / HEAT_GRID) * dust2.scale - pixels * dust2.scale,
  };
}

/** A source that stands `weight` seconds at each of the given bins. */
function standing(...spots: readonly (readonly [number, number, number])[]): HeatSource {
  return (visit) => {
    let total = 0;
    for (const [binX, binY, weight] of spots) {
      const at = worldAtBin(binX, binY);
      visit(at.x, at.y, 0, weight, { seconds: 0, side: null, buy: null });
      total += weight;
    }

    return { bySlot: new Float32Array(0), total };
  };
}

function field(source: HeatSource): HeatField {
  return heatFieldOf(dust2, source);
}

describe('routesOverlap', () => {
  it('is whole for the same ground and nothing for ground that never meets', () => {
    const here = field(standing([60, 60, 10]));

    expect(routesOverlap(here, here)).toBeCloseTo(1, 5);
    expect(routesOverlap(here, field(standing([200, 200, 10])))).toBeCloseTo(0, 5);
  });

  it('compares shares of each own time, so a match twice as long overlaps as much', () => {
    const short = field(standing([60, 60, 5], [100, 100, 5]));
    const long = field(standing([60, 60, 50], [100, 100, 50]));

    expect(routesOverlap(short, long)).toBeCloseTo(1, 4);
  });

  it('counts the part of the ground two players share', () => {
    const first = field(standing([60, 60, 10], [150, 150, 10]));
    const second = field(standing([60, 60, 10], [250, 250, 10]));

    expect(routesOverlap(first, second)).toBeCloseTo(0.5, 2);
  });

  it('has no answer when either field is empty', () => {
    expect(routesOverlap(field(standing()), field(standing([60, 60, 1])))).toBeNull();
  });
});

describe('heatDifference', () => {
  const first = field(standing([60, 60, 10], [150, 150, 5]));
  const second = field(standing([150, 150, 5], [250, 250, 10]));
  const difference = heatDifference(first, second);

  it('is positive where the first spends more of its time, negative where the second does', () => {
    expect(difference?.bins[60 * HEAT_GRID + 60]).toBeGreaterThan(DIFFERENCE_CUT);
    expect(difference?.bins[250 * HEAT_GRID + 250]).toBeLessThan(-DIFFERENCE_CUT);
  });

  it('is scaled so that the largest difference is one, and the shared ground is not drawn', () => {
    const largest = Array.from(difference?.bins ?? []).reduce(
      (most, bin) => Math.max(most, Math.abs(bin)),
      0,
    );

    expect(largest).toBeCloseTo(1, 5);
    expect(Math.abs(difference?.bins[150 * HEAT_GRID + 150] ?? 1)).toBeLessThan(DIFFERENCE_CUT);
  });

  it('is empty rather than not a number for two identical fields', () => {
    const same = heatDifference(first, first);

    expect(same?.bins.every((bin) => bin === 0)).toBe(true);
  });

  it('has no answer when either field is empty', () => {
    expect(heatDifference(first, field(standing()))).toBeNull();
  });
});

describe('heatFieldOf', () => {
  it('keeps the density the ramp was read from, which a longer match scales and the shares do not', () => {
    const one = field(standing([60, 60, 10]));
    const ten = field(standing([60, 60, 100]));

    expect(one.bins[60 * HEAT_GRID + 60]).toBe(ten.bins[60 * HEAT_GRID + 60]);
    expect(ten.density[60 * HEAT_GRID + 60]).toBeGreaterThan(one.density[60 * HEAT_GRID + 60] ?? 0);
  });
});

describe('heatRingsOf', () => {
  it('puts each point on the plate in radar pixels and keeps the tally', () => {
    const marks = heatRingsOf(dust2, standing([100, 200, 3]));
    const radarPixels = RADAR_IMAGE_SIZE / HEAT_GRID;

    expect(marks.count).toBe(1);
    expect(marks.points[0]).toBeCloseTo(100.5 * radarPixels, 3);
    expect(marks.points[1]).toBeCloseTo(200.5 * radarPixels, 3);
    expect(marks.total).toBe(3);
  });
});

describe('heatRamps', () => {
  const ramps = heatRamps({ low: '#2fbf71', high: '#f2f06b', second: '#ff6ad5' });

  it('runs a player from their dark end to their light end through their own colour', () => {
    const first = ramps.first;
    const middle = rampIndex(0.5);

    expect(first).toHaveLength(RAMP_STEPS * 3);
    // The middle of the ramp is the hue itself (to a step of rounding).
    expect(Math.abs((first[middle] ?? 0) - 0xf2)).toBeLessThan(3);
    expect(Math.abs((first[middle + 1] ?? 0) - 0xf0)).toBeLessThan(3);
    expect(first[0]).toBeLessThan(first[middle] ?? 0);
    expect(first[RAMP_STEPS * 3 - 1]).toBeGreaterThan(first[middle + 2] ?? 0);
  });

  it('keeps the two players two colours at the same weight', () => {
    const at = rampIndex(0.5);

    expect(ramps.first[at]).not.toBe(ramps.second[at]);
    expect(ramps.first[at + 1]).not.toBe(ramps.second[at + 1]);
  });

  it('ends the field ramp on white', () => {
    const last = rampIndex(1);

    expect([ramps.field[last], ramps.field[last + 1], ramps.field[last + 2]]).toEqual([
      255, 255, 255,
    ]);
  });
});
