import { describe, expect, it } from 'vitest';
import { mapSpawns } from '../spawns';

describe('mapSpawns', () => {
  it('holds spots for each side of the measured maps, apart from one another', () => {
    for (const map of ['de_dust2', 'de_inferno']) {
      for (const side of ['CT', 'T'] as const) {
        const spawns = mapSpawns(map, side);
        expect(spawns.length).toBeGreaterThanOrEqual(5);
        for (const [i, a] of spawns.entries()) {
          for (const b of spawns.slice(i + 1)) {
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(32);
          }
        }
      }
    }
  });

  it('answers nothing for a map nobody measured, and for one that is not a map at all', () => {
    expect(mapSpawns('de_nuke', 'T')).toEqual([]);
    expect(mapSpawns('toString', 'T')).toEqual([]);
  });
});
