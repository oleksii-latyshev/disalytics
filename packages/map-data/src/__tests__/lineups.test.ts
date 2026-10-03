import { describe, expect, it } from 'vitest';
import { loadMapLineups, MAP_IDS } from '../index';

describe('lineup catalog', () => {
  it('ships the Mirage lineups as valid built-ins of that map', async () => {
    const lineups = await loadMapLineups('de_mirage');

    expect(lineups.length).toBe(10);
    expect(new Set(lineups.map((lineup) => lineup.id)).size).toBe(lineups.length);
    for (const lineup of lineups) {
      expect(lineup.map).toBe('de_mirage');
      expect(lineup.isBuiltIn).toBe(true);
    }
  });

  it('ships nothing for the other maps yet', async () => {
    for (const mapId of MAP_IDS.filter((id) => id !== 'de_mirage')) {
      expect(await loadMapLineups(mapId)).toEqual([]);
    }
  });

  it('returns no lineups for an unknown map', async () => {
    expect(await loadMapLineups('de_unknown')).toEqual([]);
  });
});
