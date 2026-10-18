import { describe, expect, it } from 'vitest';
import { EXTRA_FLOORS, floorAt, floorAtRadar, floorRefZ, mapFloors } from '../floors';
import { MAP_OVERVIEWS } from '../generated/overviews';
import { radarToWorld } from '../transform';

describe('mapFloors', () => {
  it('names Nuke upper and lower, and Mirage main and underpass', () => {
    expect(mapFloors(MAP_OVERVIEWS.de_nuke).map((floor) => floor.id)).toEqual(['upper', 'lower']);
    expect(mapFloors(MAP_OVERVIEWS.de_mirage).map((floor) => floor.id)).toEqual([
      'main',
      'underpass',
    ]);
  });

  it('gives a one-floor map one floor', () => {
    expect(mapFloors(MAP_OVERVIEWS.de_inferno)).toHaveLength(1);
  });

  it('puts the overview levels first, an extra floor on the image of the level it shares', () => {
    const floors = mapFloors(MAP_OVERVIEWS.de_mirage);
    expect(floors.map((floor) => floor.level)).toEqual([0, 0]);
    expect(floors.map((floor) => floor.isExtra)).toEqual([false, true]);
    expect(mapFloors(MAP_OVERVIEWS.de_nuke).map((floor) => floor.level)).toEqual([0, 1]);
  });

  it('is memoised per overview', () => {
    expect(mapFloors(MAP_OVERVIEWS.de_nuke)).toBe(mapFloors(MAP_OVERVIEWS.de_nuke));
  });
});

describe('floorAt', () => {
  const nuke = MAP_OVERVIEWS.de_nuke;
  const mirage = MAP_OVERVIEWS.de_mirage;
  const region = EXTRA_FLOORS.de_mirage?.[0]?.region;

  it('reads a point without an altitude as floor 0', () => {
    expect(floorAt(nuke, 0, 0, undefined)).toBe(0);
    expect(floorAt(mirage, 0, 0, undefined)).toBe(0);
  });

  it('splits Nuke at the level boundary', () => {
    expect(floorAt(nuke, 0, 0, -400)).toBe(0);
    expect(floorAt(nuke, 0, 0, -495)).toBe(1);
    expect(floorAt(nuke, 0, 0, -700)).toBe(1);
  });

  it('puts Mirage low ground inside the underpass region on the underpass', () => {
    if (region === undefined) throw new Error('no underpass region');
    const inside = radarToWorld(mirage, { x: region.x + 20, y: region.y + 20 });
    expect(floorAt(mirage, inside.x, inside.y, -300)).toBe(1);
    expect(floorAt(mirage, inside.x, inside.y, -170)).toBe(0);
  });

  it('keeps low ground outside the region on the main floor', () => {
    const outside = radarToWorld(mirage, { x: 330, y: 700 });
    expect(floorAt(mirage, outside.x, outside.y, -300)).toBe(0);
  });

  it('is half-open on the region like the levels are on altitude', () => {
    if (region === undefined) throw new Error('no underpass region');
    expect(floorAtRadar(mirage, region.x, region.y, -300)).toBe(1);
    expect(floorAtRadar(mirage, region.x + region.width, region.y, -300)).toBe(0);
    expect(floorAtRadar(mirage, region.x, region.y, -230)).toBe(1);
    expect(floorAtRadar(mirage, region.x, region.y, -229)).toBe(0);
  });
});

describe('floorRefZ', () => {
  it('reads back as its own floor, in the middle of the underpass region too', () => {
    for (const overview of [MAP_OVERVIEWS.de_nuke, MAP_OVERVIEWS.de_mirage]) {
      mapFloors(overview).forEach((_, floor) => {
        const z = floorRefZ(overview, floor);
        expect(floorAtRadar(overview, 450, 300, z)).toBe(floor);
      });
    }
  });

  it('falls back to floor 0 for a floor the map does not have', () => {
    expect(floorRefZ(MAP_OVERVIEWS.de_nuke, 5)).toBe(floorRefZ(MAP_OVERVIEWS.de_nuke, 0));
  });
});
