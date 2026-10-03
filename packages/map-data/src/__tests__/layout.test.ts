import { describe, expect, it } from 'vitest';
import { MAP_IDS, MAP_OVERVIEWS, RADAR_IMAGE_SIZE } from '../generated/overviews';
import { plateLayout, plateLevelIndex, plateToRadar, plateX, plateY } from '../layout';
import { radarX, radarY } from '../transform';

const nuke = MAP_OVERVIEWS.de_nuke;
const dust2 = MAP_OVERVIEWS.de_dust2;

const UPPER_Z = 0;
const LOWER_Z = -700;

describe('plateLayout', () => {
  it('gives every level of every map a slot', () => {
    for (const id of MAP_IDS) {
      const overview = MAP_OVERVIEWS[id];
      expect(plateLayout(overview).slots).toHaveLength(overview.levels.length);
    }
  });

  it('leaves a single-level map as its own image', () => {
    const layout = plateLayout(dust2);

    expect(layout.width).toBe(RADAR_IMAGE_SIZE);
    expect(layout.height).toBe(RADAR_IMAGE_SIZE);
    expect(layout.slots[0]).toMatchObject({ cropX: 0, cropY: 0, x: 0, y: 0, floor: null });
  });

  it('keeps every Nuke floor inside its crop with room to spare', () => {
    for (const slot of plateLayout(nuke).slots) {
      expect(slot.cropX).toBeLessThanOrEqual(61);
      expect(slot.cropY).toBeLessThanOrEqual(278);
      expect(slot.cropX + slot.width).toBeGreaterThanOrEqual(998);
      expect(slot.cropY + slot.height).toBeGreaterThanOrEqual(770);
    }
  });

  it('stacks the Nuke floors without overlap, upper first', () => {
    const [upper, lower] = plateLayout(nuke).slots;

    expect(upper?.floor).toBe('upper');
    expect(lower?.floor).toBe('lower');
    expect(upper !== undefined && lower !== undefined && lower.y >= upper.y + upper.height).toBe(
      true,
    );
    expect(plateLayout(nuke).height).toBeGreaterThanOrEqual((lower?.y ?? 0) + (lower?.height ?? 0));
  });
});

describe('plateLevelIndex', () => {
  it('reads the altitude band, half-open at the split', () => {
    expect(plateLevelIndex(nuke, UPPER_Z)).toBe(0);
    expect(plateLevelIndex(nuke, LOWER_Z)).toBe(1);
    expect(plateLevelIndex(nuke, -495)).toBe(1);
  });

  it('falls back to the default level out of band', () => {
    expect(plateLevelIndex(nuke, 20000)).toBe(0);
    expect(plateLevelIndex(nuke, -20000)).toBe(0);
  });
});

describe('plateX / plateY', () => {
  it('is the radar transform on a single-level map', () => {
    expect(plateX(dust2, 123, 40)).toBe(radarX(dust2, 123));
    expect(plateY(dust2, -456, 40)).toBe(radarY(dust2, -456));
  });

  it('puts the same world spot on a different row for each Nuke floor', () => {
    const upper = plateY(nuke, 0, UPPER_Z);
    const lower = plateY(nuke, 0, LOWER_Z);
    const [, lowerSlot] = plateLayout(nuke).slots;

    expect(lower - upper).toBeCloseTo(lowerSlot?.y ?? Number.NaN);
    expect(plateX(nuke, 0, UPPER_Z)).toBeCloseTo(plateX(nuke, 0, LOWER_Z));
  });

  it('shifts by the crop', () => {
    expect(plateX(nuke, 0, UPPER_Z)).toBeCloseTo(radarX(nuke, 0) - 52);
    expect(plateY(nuke, 0, UPPER_Z)).toBeCloseTo(radarY(nuke, 0) - 268);
  });
});

describe('plateToRadar', () => {
  it('inverts plateX/plateY on both floors', () => {
    for (const [z, levelIndex] of [
      [UPPER_Z, 0],
      [LOWER_Z, 1],
    ] as const) {
      const point = plateToRadar(nuke, plateX(nuke, 300, z), plateY(nuke, -900, z));

      expect(point.levelIndex).toBe(levelIndex);
      expect(point.x).toBeCloseTo(radarX(nuke, 300));
      expect(point.y).toBeCloseTo(radarY(nuke, -900));
    }
  });

  it('gives the gap and the plate edges to the nearest floor', () => {
    const { slots, height } = plateLayout(nuke);
    const [upper] = slots;
    const upperBottom = (upper?.y ?? 0) + (upper?.height ?? 0);

    expect(plateToRadar(nuke, 0, upperBottom + 1).levelIndex).toBe(0);
    expect(plateToRadar(nuke, 0, height - 1).levelIndex).toBe(1);
    expect(plateToRadar(nuke, 0, -50).levelIndex).toBe(0);
  });
});
