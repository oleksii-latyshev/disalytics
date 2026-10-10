import { describe, expect, it } from 'vitest';
import { setSpawn } from '../helpers/tactic-edits';
import { createNewTactic } from '../helpers/tactic-setup';
import { nearestSpawnIndex } from '../helpers/tactic-spawns';

const spots = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 400, y: 0 },
];

describe('nearestSpawnIndex', () => {
  it('finds the spot a position stands on and none beside it', () => {
    expect(nearestSpawnIndex(spots, { x: 200, y: 1 })).toBe(1);
    expect(nearestSpawnIndex(spots, { x: 230, y: 0 })).toBeNull();
    expect(nearestSpawnIndex(spots, { x: 190, y: 10 }, 64)).toBe(1);
    expect(nearestSpawnIndex([], { x: 0, y: 0 })).toBeNull();
  });
});

describe('setSpawn', () => {
  const base = createNewTactic('de_mirage', 'T');

  it('moves a slot to a spot', () => {
    const next = setSpawn(base, 0, { x: 1, y: 2 });
    expect(next.spawns[0]).toEqual({ x: 1, y: 2 });
    expect(next.spawns[1]).toEqual(base.spawns[1]);
  });

  it('trades places with whoever stood on that spot', () => {
    const next = setSpawn(base, 0, base.spawns[1] ?? { x: 0, y: 0 });
    expect(next.spawns[0]).toEqual(base.spawns[1]);
    expect(next.spawns[1]).toEqual(base.spawns[0]);
  });
});
