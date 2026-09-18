import { isLineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_LINEUP_MAPS,
  getMapOverview,
  hasBuiltInLineups,
  loadMapLineups,
  RADAR_IMAGE_SIZE,
  radarX,
  radarY,
} from '../index';

describe('Built-in Lineups Library', () => {
  it('identifies supported maps with hasBuiltInLineups', () => {
    expect(hasBuiltInLineups('de_dust2')).toBe(true);
    expect(hasBuiltInLineups('de_mirage')).toBe(true);
    expect(hasBuiltInLineups('de_inferno')).toBe(true);
    expect(hasBuiltInLineups('de_unknown')).toBe(false);
  });

  it('returns empty array for unsupported or unknown maps', async () => {
    const empty = await loadMapLineups('de_unknown');
    expect(empty).toEqual([]);
  });

  it('loads valid lineups conforming to Lineup schema for every supported map', async () => {
    for (const mapId of BUILT_IN_LINEUP_MAPS) {
      const lineups = await loadMapLineups(mapId);
      expect(lineups.length).toBeGreaterThan(0);

      const overview = getMapOverview(mapId);
      expect(overview).toBeDefined();
      if (overview === undefined) continue;

      for (const lineup of lineups) {
        expect(isLineup(lineup)).toBe(true);
        expect(lineup.map).toBe(mapId);
        expect(lineup.isBuiltIn).toBe(true);
        expect(lineup.command).toContain('setpos');
        expect(lineup.command).toContain('setang');

        // Check that origin and landing transform to radar coordinates inside or near the plate [0, 1024]
        const rxOrigin = radarX(overview, lineup.origin.x);
        const ryOrigin = radarY(overview, lineup.origin.y);
        const rxLand = radarX(overview, lineup.landing.x);
        const ryLand = radarY(overview, lineup.landing.y);

        expect(rxOrigin).toBeGreaterThanOrEqual(0);
        expect(rxOrigin).toBeLessThanOrEqual(RADAR_IMAGE_SIZE);
        expect(ryOrigin).toBeGreaterThanOrEqual(0);
        expect(ryOrigin).toBeLessThanOrEqual(RADAR_IMAGE_SIZE);

        expect(rxLand).toBeGreaterThanOrEqual(0);
        expect(rxLand).toBeLessThanOrEqual(RADAR_IMAGE_SIZE);
        expect(ryLand).toBeGreaterThanOrEqual(0);
        expect(ryLand).toBeLessThanOrEqual(RADAR_IMAGE_SIZE);
      }
    }
  });
});
