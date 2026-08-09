import { describe, expect, it } from 'vitest';
import { MAP_IDS, MAP_OVERVIEWS, RADAR_IMAGE_SIZE } from '../generated/overviews';
import { getMapOverview, isMapId, radarLevelAt, radarToWorld, worldToRadar } from '../transform';

const dust2 = MAP_OVERVIEWS.de_dust2;
const nuke = MAP_OVERVIEWS.de_nuke;

describe('worldToRadar', () => {
  it('puts the overview origin at the image corner', () => {
    expect(worldToRadar(dust2, { x: dust2.posX, y: dust2.posY })).toEqual({ x: 0, y: 0 });
  });

  it('divides world units by the map scale', () => {
    // 440 units east of the origin, at dust2's 4.4 units per pixel.
    const east = worldToRadar(dust2, { x: dust2.posX + 440, y: dust2.posY });
    expect(east.x).toBeCloseTo(100);
    expect(east.y).toBeCloseTo(0);
  });

  it('inverts Y — walking north moves up the image, not down', () => {
    expect(worldToRadar(dust2, { x: dust2.posX, y: dust2.posY - 440 }).y).toBeCloseTo(100);
    expect(worldToRadar(dust2, { x: dust2.posX, y: dust2.posY + 440 }).y).toBeCloseTo(-100);
  });

  it('places real dust2 positions inside the image', () => {
    // Two players' spawn positions, taken from frame 0 of the golden snapshot in
    // crates/demo-parser/tests/snapshots/parsed-demo.json.
    const spawns = [
      { x: 351.3921203613281, y: 2352.9423828125 },
      { x: -857.5065307617188, y: -738.361328125 },
    ];

    for (const spawn of spawns) {
      const point = worldToRadar(dust2, spawn);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(RADAR_IMAGE_SIZE);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(RADAR_IMAGE_SIZE);
    }
  });
});

describe('radarToWorld', () => {
  it('puts the image corner back on the overview origin', () => {
    expect(radarToWorld(dust2, { x: 0, y: 0 })).toEqual({ x: dust2.posX, y: dust2.posY });
  });

  it('returns whatever worldToRadar was given', () => {
    for (const overview of [dust2, nuke]) {
      const world = { x: overview.posX + 913, y: overview.posY - 1177 };
      const round = radarToWorld(overview, worldToRadar(overview, world));

      expect(round.x).toBeCloseTo(world.x);
      expect(round.y).toBeCloseTo(world.y);
    }
  });
});

describe('radarLevelAt', () => {
  it('keeps single-level maps on their only image', () => {
    for (const z of [-10_000, 0, 10_000]) {
      expect(radarLevelAt(dust2, z).image).toBe('de_dust2');
    }
  });

  it('splits nuke at the altitude valve declares', () => {
    expect(radarLevelAt(nuke, 0).image).toBe('de_nuke');
    expect(radarLevelAt(nuke, -494).image).toBe('de_nuke');
    expect(radarLevelAt(nuke, -600).image).toBe('de_nuke_lower');
  });

  it('reads the boundary as belonging to the lower level', () => {
    expect(radarLevelAt(nuke, -495).image).toBe('de_nuke_lower');
  });

  it('falls back to the default level below every declared band', () => {
    expect(radarLevelAt(nuke, -99_999).image).toBe('de_nuke');
  });
});

describe('map lookup', () => {
  it('accepts every map in the pool', () => {
    for (const id of MAP_IDS) expect(isMapId(id)).toBe(true);
  });

  it('rejects a map the pool does not carry', () => {
    expect(isMapId('de_train')).toBe(false);
    expect(getMapOverview('workshop/12345/de_rats')).toBeUndefined();
  });

  it('does not mistake an inherited property for a map', () => {
    expect(isMapId('toString')).toBe(false);
    expect(isMapId('constructor')).toBe(false);
  });
});

describe('generated data', () => {
  it('leads every map with its default level', () => {
    for (const id of MAP_IDS) {
      expect(MAP_OVERVIEWS[id].levels[0].image).toBe(id);
    }
  });

  it('carries a positive scale for every map', () => {
    for (const id of MAP_IDS) expect(MAP_OVERVIEWS[id].scale).toBeGreaterThan(0);
  });
});
