import { asPlayerSlot, HEAT_BINS } from '@disa/demo-core';
import { MAP_OVERVIEWS, RADAR_IMAGE_SIZE } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { heatBinsOf, heatFieldOfBins } from '../helpers/heat-bins';
import { HEAT_GRID, type HeatSource, heatFieldOf } from '../helpers/heat-field';

const dust2 = MAP_OVERVIEWS.de_dust2;

function worldAtBin(binX: number, binY: number) {
  const pixels = (RADAR_IMAGE_SIZE / HEAT_GRID) * 0.5;

  return {
    x: dust2.posX + ((binX * RADAR_IMAGE_SIZE) / HEAT_GRID) * dust2.scale + pixels * dust2.scale,
    y: dust2.posY - ((binY * RADAR_IMAGE_SIZE) / HEAT_GRID) * dust2.scale - pixels * dust2.scale,
  };
}

/** Slot 0 stands at one spot in the first ten seconds and another after; slot 1 elsewhere. */
function marks(from: number, to: number): HeatSource {
  const spots = [
    { slot: 0, seconds: 2, at: worldAtBin(60, 60) },
    { slot: 0, seconds: 12, at: worldAtBin(100, 100) },
    { slot: 0, seconds: 22, at: worldAtBin(150, 150) },
    { slot: 1, seconds: 3, at: worldAtBin(200, 200) },
  ];

  return (visit) => {
    let total = 0;
    for (const spot of spots) {
      if (spot.seconds < from || spot.seconds >= to) continue;

      visit(spot.at.x, spot.at.y, 0, 1, {
        slot: asPlayerSlot(spot.slot),
        seconds: spot.seconds,
        side: null,
        buy: null,
      });
      total += 1;
    }

    return { bySlot: new Float32Array(0), total };
  };
}

describe('heatBinsOf', () => {
  const bins = heatBinsOf(dust2, marks(0, 1000), asPlayerSlot(0), 2);

  it('sums the steps of a window into the field that window would have given', () => {
    const summed = heatFieldOfBins(bins, 0, 3);
    const direct = heatFieldOf(dust2, (visit) => {
      const tally = marks(
        0,
        20,
      )((x, y, z, w, mark) => {
        if (mark.slot === 0) visit(x, y, z, w, mark);
      });

      return tally;
    });

    expect(summed.total).toBe(2);
    for (let at = 0; at < direct.density.length; at += 97) {
      expect(summed.density[at]).toBeCloseTo(direct.density[at] ?? 0, 5);
    }
  });

  it("keeps every player's figure in the window, whoever is drawn", () => {
    const window = heatFieldOfBins(bins, 0, 3);

    expect([...window.bySlot]).toEqual([2, 1]);
  });

  it('puts the end of a range that reaches the last step on everything after it', () => {
    expect(heatFieldOfBins(bins, 4, HEAT_BINS - 1).total).toBe(1);
  });
});
