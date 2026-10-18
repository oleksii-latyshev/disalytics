import { RADAR_IMAGE_SIZE } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { throwRegion } from '../regions';

describe('throwRegion', () => {
  it('frames both ends of a short throw, centred between them', () => {
    const region = throwRegion({ x: 500, y: 500 }, { x: 600, y: 540 });
    expect(region.size).toBe(240);
    expect(region.x + region.size / 2).toBeCloseTo(550, 0);
    expect(region.y + region.size / 2).toBeCloseTo(520, 0);
  });

  it('grows with the throw', () => {
    const region = throwRegion({ x: 400, y: 500 }, { x: 700, y: 500 });
    expect(region.size).toBeGreaterThan(240);
    expect(region.size).toBeLessThanOrEqual(520);
  });

  it('shows only where a very long throw lands', () => {
    const region = throwRegion({ x: 50, y: 50 }, { x: 900, y: 900 });
    expect(region.size).toBe(400);
    expect(region.x + region.size).toBe(RADAR_IMAGE_SIZE);
  });

  it('never leaves the plate', () => {
    for (const to of [
      { x: 0, y: 0 },
      { x: RADAR_IMAGE_SIZE, y: RADAR_IMAGE_SIZE },
    ]) {
      const region = throwRegion(to, to);
      expect(region.x).toBeGreaterThanOrEqual(0);
      expect(region.y).toBeGreaterThanOrEqual(0);
      expect(region.x + region.size).toBeLessThanOrEqual(RADAR_IMAGE_SIZE);
      expect(region.y + region.size).toBeLessThanOrEqual(RADAR_IMAGE_SIZE);
    }
  });
});
