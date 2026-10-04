import type { Lineup, TacticStep } from '@disa/demo-core';
import { getMapOverview, mapSpawns, worldToRadar } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { addLineupThrowToStep } from '../helpers/lineup-throw';
import { findNearestTacticSpawn } from '../helpers/tactic-plot';
import {
  assignPlayerToSpawn,
  nearestSpawnIndex,
  occupiedSpots,
  placeWithSpawnSwap,
  SPAWN_SNAP_UNITS,
  snapPlayerToSpawn,
  snapToSpawn,
  spawnSpotOf,
} from '../helpers/tactic-spawns';

const spawns = [
  { x: 0, y: 0, z: 0 },
  { x: 200, y: 0, z: 0 },
  { x: 400, y: 0, z: 0 },
];

function stepAt(...positions: readonly (readonly [number, number])[]): TacticStep {
  return {
    id: 's',
    name: '',
    timeOffsetSeconds: 0,
    players: positions.map(([x, y], slot) => ({ slot, x, y })),
    throws: [],
  };
}

function at(step: TacticStep, slot: number) {
  const player = step.players.find((entry) => entry.slot === slot);
  return [player?.x, player?.y];
}

describe('nearestSpawnIndex', () => {
  it('finds the nearest spot within the radius and none beyond it', () => {
    expect(nearestSpawnIndex(spawns, { x: 190, y: 10 })).toBe(1);
    expect(nearestSpawnIndex(spawns, { x: SPAWN_SNAP_UNITS, y: 0 })).toBe(0);
    expect(nearestSpawnIndex(spawns, { x: 100, y: 100 })).toBeNull();
    expect(nearestSpawnIndex([], { x: 0, y: 0 })).toBeNull();
  });
});

describe('spawnSpotOf', () => {
  it('counts only a position on the spot, not merely near it', () => {
    expect(spawnSpotOf(spawns, { x: 200, y: 1 })).toBe(1);
    expect(spawnSpotOf(spawns, { x: 230, y: 0 })).toBeNull();
  });
});

describe('snapToSpawn', () => {
  it('pulls a point onto the spot and leaves a far one alone', () => {
    expect(snapToSpawn(spawns, { x: 380, y: 20 })).toEqual(spawns[2]);
    expect(snapToSpawn(spawns, { x: 100, y: 0 })).toEqual({ x: 100, y: 0 });
  });
});

describe('occupiedSpots', () => {
  it('marks the spots a player stands on', () => {
    expect(occupiedSpots(spawns, stepAt([0, 0], [400, 0], [50, 50]).players)).toEqual([
      true,
      false,
      true,
    ]);
  });
});

describe('assignPlayerToSpawn', () => {
  it('moves a player onto a free spot', () => {
    const next = assignPlayerToSpawn(stepAt([0, 0], [500, 500]), 1, spawns, 1);
    expect(at(next, 1)).toEqual([200, 0]);
    expect(at(next, 0)).toEqual([0, 0]);
  });

  it('swaps with whoever holds the spot, who takes the mover old position', () => {
    const next = assignPlayerToSpawn(stepAt([0, 0], [200, 0]), 0, spawns, 1);
    expect(at(next, 0)).toEqual([200, 0]);
    expect(at(next, 1)).toEqual([0, 0]);
  });

  it('is a no-op for a spot that does not exist', () => {
    const step = stepAt([0, 0]);
    expect(assignPlayerToSpawn(step, 0, spawns, 9)).toBe(step);
  });

  it('never leaves two players on one spot across a chain of moves', () => {
    let step = stepAt([0, 0], [200, 0], [400, 0]);
    step = assignPlayerToSpawn(step, 0, spawns, 2);
    step = assignPlayerToSpawn(step, 1, spawns, 2);
    const spots = step.players.map((player) => spawnSpotOf(spawns, player));
    expect(new Set(spots).size).toBe(3);
  });
});

describe('placeWithSpawnSwap and snapPlayerToSpawn', () => {
  it('snaps a point near a spot onto it, swapping, and moves freely elsewhere', () => {
    const base = stepAt([0, 0], [200, 0]);
    const snapped = placeWithSpawnSwap(base, 0, { x: 230, y: 10 }, spawns);
    expect(at(snapped, 0)).toEqual([200, 0]);
    expect(at(snapped, 1)).toEqual([0, 0]);
    expect(at(placeWithSpawnSwap(base, 0, { x: 100, y: 100 }, spawns), 0)).toEqual([100, 100]);
  });

  it('snaps a released player and leaves a distant one', () => {
    expect(at(snapPlayerToSpawn(stepAt([0, 0], [380, 20]), 1, spawns), 1)).toEqual([400, 0]);
    const far = stepAt([0, 0], [100, 100]);
    expect(snapPlayerToSpawn(far, 1, spawns)).toBe(far);
  });
});

describe('lineup from a spawn spot', () => {
  const lineup: Lineup = {
    id: 'l',
    title: 'l',
    map: 'de_mirage',
    side: 'T',
    kind: 'smoke',
    origin: { x: 210, y: 5, z: 0 },
    landing: { x: 900, y: 900, z: 0 },
    pitch: 0,
    yaw: 0,
    throwType: 'stand',
    movementKeys: [],
    movementKeysSummary: '',
    command: '',
    createdAt: 1,
  };

  it('puts the thrower on the spot and swaps the occupant out', () => {
    const next = addLineupThrowToStep(stepAt([0, 0], [200, 0]), lineup, 0, spawns);
    expect(at(next, 0)).toEqual([200, 0]);
    expect(at(next, 1)).toEqual([0, 0]);
    expect(next.throws).toHaveLength(1);
  });

  it('goes to the origin itself without spawns', () => {
    const next = addLineupThrowToStep(stepAt([0, 0], [200, 0]), lineup, 0);
    expect(at(next, 0)).toEqual([210, 5]);
    expect(at(next, 1)).toEqual([200, 0]);
  });
});

describe('findNearestTacticSpawn', () => {
  it('hits the spot under the pointer and none away from it', () => {
    const overview = getMapOverview('de_mirage');
    const points = mapSpawns('de_mirage', 'T');
    const first = points[0];
    if (overview === undefined || first === undefined) throw new Error('no mirage data');
    const pt = worldToRadar(overview, first);
    expect(findNearestTacticSpawn(pt, points, overview, 1)).toBe(0);
    expect(
      findNearestTacticSpawn({ x: pt.x + 400, y: pt.y + 400 }, points, overview, 1),
    ).toBeNull();
  });
});
