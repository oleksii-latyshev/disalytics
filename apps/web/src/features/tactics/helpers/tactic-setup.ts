import {
  TACTIC_ROUNDS,
  type Tactic,
  type TacticPlayerPosition,
  type TacticRound,
  type TacticSide,
  type TacticStep,
} from '@disa/demo-core';
import { getMapOverview, mapSpawns, RADAR_IMAGE_SIZE } from '@disa/map-data';
import { generateId } from './editor-actions';
import { tacticRadarToWorld } from './tactic-plot';

export const TACTIC_SLOT_COUNT = 5;

const FORMATION_SPACING_RADAR = 96;
const FORMATION_MARGIN_RADAR = 64;
const FALLBACK_SPACING_UNITS = 150;

/** Which of `count` spawn spots each of the five slots takes: evenly spaced, so the team spreads. */
export function spawnIndices(count: number): readonly number[] {
  if (count < TACTIC_SLOT_COUNT) return [];
  return Array.from({ length: TACTIC_SLOT_COUNT }, (_, slot) =>
    Math.floor((slot * count) / TACTIC_SLOT_COUNT),
  );
}

/** Five players on distinct spawn spots of their side, where a round starts; null without data. */
function spawnPlayers(map: string, side: TacticSide): readonly TacticPlayerPosition[] | null {
  const spawns = mapSpawns(map, side);
  const indices = spawnIndices(spawns.length);
  if (indices.length === 0) return null;
  return indices.map((spawnIndex, slot) => {
    const spawn = spawns[spawnIndex];
    return { slot, x: spawn?.x ?? 0, y: spawn?.y ?? 0, yaw: 0 };
  });
}

/**
 * Five players on their side's spawn spots when the map has them, so a tactic starts where a round
 * does; otherwise in a row along the plate edge of their side, spaced so tokens and their labels
 * do not touch. The tactic builder drags them from there.
 */
export function startingPlayers(map: string, side: TacticSide): readonly TacticPlayerPosition[] {
  const spawned = spawnPlayers(map, side);
  if (spawned !== null) return spawned;
  const overview = getMapOverview(map);
  return Array.from({ length: TACTIC_SLOT_COUNT }, (_, slot) => {
    if (overview === undefined) {
      return { slot, x: slot * FALLBACK_SPACING_UNITS, y: 0, yaw: 0 };
    }
    const offset = (slot - (TACTIC_SLOT_COUNT - 1) / 2) * FORMATION_SPACING_RADAR;
    const world = tacticRadarToWorld(overview, {
      x: RADAR_IMAGE_SIZE / 2 + offset,
      y: side === 'T' ? RADAR_IMAGE_SIZE - FORMATION_MARGIN_RADAR : FORMATION_MARGIN_RADAR,
    });
    return { slot, x: Math.round(world.x), y: Math.round(world.y), yaw: 0 };
  });
}

export function createNewTactic(map: string, side: TacticSide): Tactic {
  const now = Date.now();
  return {
    id: generateId('tactic'),
    title: '',
    map,
    side,
    createdAt: now,
    updatedAt: now,
    steps: [
      {
        id: generateId('step'),
        name: '',
        timeOffsetSeconds: 0,
        players: startingPlayers(map, side),
        throws: [],
        drawings: [],
      },
    ],
  };
}

function samePositions(
  a: readonly TacticPlayerPosition[],
  b: readonly TacticPlayerPosition[],
): boolean {
  return (
    a.length === b.length &&
    a.every((player, index) => {
      const other = b[index];
      return other !== undefined && player.x === other.x && player.y === other.y;
    })
  );
}

/** Whether the board holds anything beyond the starting formation, so a reset would lose work. */
export function hasEditorWork(tactic: Tactic): boolean {
  const formation = startingPlayers(tactic.map, tactic.side);
  return (
    tactic.steps.length > 1 ||
    tactic.steps.some(
      (step) =>
        step.throws.length > 0 ||
        (step.drawings?.length ?? 0) > 0 ||
        !samePositions(step.players, formation),
    )
  );
}

function resetSteps(steps: readonly TacticStep[], players: readonly TacticPlayerPosition[]) {
  return steps.map((step) => ({ ...step, players, throws: [], drawings: [] }));
}

/** Another map invalidates every coordinate, so positions, throws and drawings start over. */
export function changeTacticMap(tactic: Tactic, map: string): Tactic {
  if (map === tactic.map) return tactic;
  return {
    ...tactic,
    map,
    steps: resetSteps(tactic.steps, startingPlayers(map, tactic.side)),
    updatedAt: Date.now(),
  };
}

/** An untouched formation follows the side to its own edge; anything the user moved stays put. */
export function changeTacticSide(tactic: Tactic, side: TacticSide): Tactic {
  if (side === tactic.side) return tactic;
  const next = { ...tactic, side, updatedAt: Date.now() };
  if (hasEditorWork(tactic)) return next;
  return { ...next, steps: resetSteps(tactic.steps, startingPlayers(tactic.map, side)) };
}

export function toggleTacticRound(tactic: Tactic, round: TacticRound): Tactic {
  const chosen = new Set(tactic.rounds ?? []);
  if (chosen.has(round)) chosen.delete(round);
  else chosen.add(round);
  const rounds = TACTIC_ROUNDS.filter((entry) => chosen.has(entry));
  return { ...tactic, rounds, updatedAt: Date.now() };
}
