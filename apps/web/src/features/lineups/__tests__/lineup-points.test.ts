import { getMapOverview, type MapOverview, plateX, plateY } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { isNudgeKey, nudgedPoint } from '../helpers/nudge-point';
import { altitudeOnDrop, platePointOf, worldPointAt } from '../helpers/plate-point';

function overviewOf(id: string): MapOverview {
  const overview = getMapOverview(id);
  if (overview === undefined) throw new Error(`no overview for ${id}`);
  return overview;
}

describe('worldPointAt', () => {
  it('reads a single-floor map back at ground altitude, and round-trips through the plate', () => {
    const mirage = overviewOf('de_mirage');
    const world = { x: -1200, y: 300, z: 0 };
    const plate = platePointOf(mirage, world);

    const back = worldPointAt(mirage, plate);
    expect(back.x).toBeCloseTo(world.x, 6);
    expect(back.y).toBeCloseTo(world.y, 6);
    expect(back.z).toBe(0);
    expect(altitudeOnDrop(mirage, plate)).toBeUndefined();
  });

  it('puts a point on the floor it fell on when the map is stacked', () => {
    const nuke = overviewOf('de_nuke');
    const lower = { x: 100, y: -600, z: -700 };
    const plate = {
      x: plateX(nuke, lower.x, lower.z),
      y: plateY(nuke, lower.y, lower.z),
    };

    const back = worldPointAt(nuke, plate);
    expect(back.z).toBeLessThanOrEqual(-495);
    expect(plateY(nuke, back.y, back.z)).toBeCloseTo(plate.y, 6);
    expect(altitudeOnDrop(nuke, plate)).toBe(back.z);
  });

  it('keeps an upper-floor point at ground altitude', () => {
    const nuke = overviewOf('de_nuke');
    const upper = platePointOf(nuke, { x: 100, y: -600, z: 0 });

    expect(worldPointAt(nuke, upper).z).toBe(0);
  });
});

describe('nudgedPoint', () => {
  const mirage = overviewOf('de_mirage');
  const point = { x: 10, y: 20, z: 5 };

  it('moves a radar pixel, north being up the plate', () => {
    expect(nudgedPoint(mirage, point, 'ArrowUp', false)).toEqual({
      x: 10,
      y: 20 + mirage.scale,
      z: 5,
    });
    expect(nudgedPoint(mirage, point, 'ArrowLeft', false).x).toBe(10 - mirage.scale);
  });

  it('moves eight pixels with Shift and leaves other keys alone', () => {
    expect(nudgedPoint(mirage, point, 'ArrowRight', true).x).toBe(10 + 8 * mirage.scale);
    expect(nudgedPoint(mirage, point, 'a', false)).toBe(point);
    expect(isNudgeKey('ArrowDown')).toBe(true);
    expect(isNudgeKey('Enter')).toBe(false);
  });
});
