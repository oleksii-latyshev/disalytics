import { describe, expect, it } from 'vitest';
import { loadMapLineups, MAP_IDS } from '../index';

describe('lineup catalog', () => {
  it('does not ship unverified lineups on any supported map', async () => {
    for (const mapId of MAP_IDS) {
      expect(await loadMapLineups(mapId)).toEqual([]);
    }
  });

  it('returns no lineups for an unknown map', async () => {
    expect(await loadMapLineups('de_unknown')).toEqual([]);
  });
});
