import type { TacticPlayerPosition, TacticStep, WorldPoint } from '@disa/demo-core';
import { updatePlayerPosition } from './editor-actions';

/** How close a released player or a lineup origin must be to a spawn spot to take it, in world units. */
export const SPAWN_SNAP_UNITS = 64;

/** Positions are stored rounded, so a player counts as standing on a spot within this distance. */
const SPOT_TOLERANCE_UNITS = 2;

type Point = { readonly x: number; readonly y: number };

/** The spot nearest `point` within `radius`, as its index in `spawns`; null when none is close. */
export function nearestSpawnIndex(
  spawns: readonly WorldPoint[],
  point: Point,
  radius: number = SPAWN_SNAP_UNITS,
): number | null {
  let best: number | null = null;
  let bestDistance = radius;
  for (let i = 0; i < spawns.length; i++) {
    const spawn = spawns[i];
    if (spawn === undefined) continue;
    const distance = Math.hypot(spawn.x - point.x, spawn.y - point.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/** The spot a position stands on, or null when it is somewhere else ("custom"). */
export function spawnSpotOf(spawns: readonly WorldPoint[], point: Point): number | null {
  return nearestSpawnIndex(spawns, point, SPOT_TOLERANCE_UNITS);
}

/** `point`, pulled onto the spot within the snap radius; unchanged when none is close. */
export function snapToSpawn(
  spawns: readonly WorldPoint[],
  point: Point,
  radius: number = SPAWN_SNAP_UNITS,
): Point {
  const index = nearestSpawnIndex(spawns, point, radius);
  return (index === null ? undefined : spawns[index]) ?? point;
}

/** Which spots have a player on them, in the order of `spawns`. */
export function occupiedSpots(
  spawns: readonly WorldPoint[],
  players: readonly TacticPlayerPosition[],
): readonly boolean[] {
  const occupied = spawns.map(() => false);
  for (const player of players) {
    const spot = spawnSpotOf(spawns, player);
    if (spot !== null) occupied[spot] = true;
  }
  return occupied;
}

/**
 * Puts the player on a spawn spot. A player already standing there takes the mover's old position,
 * so two players never stack on one spot.
 */
export function assignPlayerToSpawn(
  step: TacticStep,
  slot: number,
  spawns: readonly WorldPoint[],
  spot: number,
): TacticStep {
  const target = spawns[spot];
  const mover = step.players.find((player) => player.slot === slot);
  if (target === undefined) return step;
  if (mover === undefined) return updatePlayerPosition(step, slot, target);

  const occupant = step.players.find(
    (player) => player.slot !== slot && spawnSpotOf(spawns, player) === spot,
  );
  const moved = updatePlayerPosition(step, slot, target);
  return occupant === undefined ? moved : updatePlayerPosition(moved, occupant.slot, mover);
}

/** Moves a player to `point`, onto the spawn spot within the snap radius when there is one. */
export function placeWithSpawnSwap(
  step: TacticStep,
  slot: number,
  point: Point,
  spawns: readonly WorldPoint[],
): TacticStep {
  const spot = nearestSpawnIndex(spawns, point);
  return spot === null
    ? updatePlayerPosition(step, slot, point)
    : assignPlayerToSpawn(step, slot, spawns, spot);
}

/** A dropped player takes the spot it was released near; anywhere else it stays where it is. */
export function snapPlayerToSpawn(
  step: TacticStep,
  slot: number,
  spawns: readonly WorldPoint[],
): TacticStep {
  const player = step.players.find((entry) => entry.slot === slot);
  if (player === undefined) return step;
  const spot = nearestSpawnIndex(spawns, player);
  return spot === null ? step : assignPlayerToSpawn(step, slot, spawns, spot);
}
