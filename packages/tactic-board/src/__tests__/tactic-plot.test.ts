import type { MapOverview } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { tacticRadarToWorld, tacticWorldToRadar } from '../helpers/tactic-plot';

const OVERVIEW: MapOverview = {
  id: 'de_mirage',
  posX: -3230,
  posY: 1713,
  scale: 5,
  rotate: 0,
  zoom: 1,
  levels: [
    {
      image: 'de_mirage',
      altitudeMax: 10000,
      altitudeMin: -10000,
    },
  ],
};

describe('tactic coordinates', () => {
  it('converts world to radar and back accurately', () => {
    const worldPoint = { x: -1200, y: 500 };
    const radarPoint = tacticWorldToRadar(OVERVIEW, worldPoint);
    const roundTrip = tacticRadarToWorld(OVERVIEW, radarPoint);

    expect(roundTrip.x).toBeCloseTo(worldPoint.x);
    expect(roundTrip.y).toBeCloseTo(worldPoint.y);
  });
});
