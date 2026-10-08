import {
  insertStep,
  removeStep,
  type Tactic,
  type TacticPoint,
  type TacticRouteMode,
  type TacticStep,
  type TacticStepPlayer,
  type TacticThrow,
  updateStepIn,
} from '@disa/demo-core';
import { generateId } from './tactic-ids';

/**
 * Every edit the board makes, as a pure function of the tactic. Steps are addressed by the plan
 * being edited and an effective index, so an edit made from a branch lands in whichever plan
 * stores that step.
 */

export interface StepAddress {
  readonly planId: string;
  readonly stepIndex: number;
}

export function emptyRoute(): TacticStepPlayer['route'] {
  return { mode: 'points', points: [] };
}

export function newStep(slotCount: number): TacticStep {
  return {
    id: generateId('step'),
    name: '',
    startsAt: null,
    players: Array.from({ length: slotCount }, (_, slot) => ({ slot, route: emptyRoute() })),
    throws: [],
  };
}

export function editStep(
  tactic: Tactic,
  at: StepAddress,
  update: (step: TacticStep) => TacticStep,
): Tactic {
  return updateStepIn(tactic, at.planId, at.stepIndex, update);
}

function editPlayer(
  step: TacticStep,
  slot: number,
  update: (player: TacticStepPlayer) => TacticStepPlayer,
): TacticStep {
  const exists = step.players.some((player) => player.slot === slot);
  const players = exists
    ? step.players.map((player) => (player.slot === slot ? update(player) : player))
    : [...step.players, update({ slot, route: emptyRoute() })];
  return { ...step, players };
}

export function renameStep(tactic: Tactic, at: StepAddress, name: string): Tactic {
  return editStep(tactic, at, (step) => ({ ...step, name }));
}

export function setStepIdea(tactic: Tactic, at: StepAddress, idea: string): Tactic {
  return editStep(tactic, at, (step) => ({ ...step, idea }));
}

/** Pins the step to seconds on the round clock, or lets it follow the step before with `null`. */
export function setStepStart(tactic: Tactic, at: StepAddress, startsAt: number | null): Tactic {
  return editStep(tactic, at, (step) => ({
    ...step,
    startsAt: startsAt === null ? null : Math.max(0, Math.round(startsAt)),
  }));
}

export function setTask(tactic: Tactic, at: StepAddress, slot: number, task: string): Tactic {
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) => ({ ...player, task: task === '' ? undefined : task })),
  );
}

export function setDelay(tactic: Tactic, at: StepAddress, slot: number, seconds: number): Tactic {
  const delaySeconds = Math.max(0, Math.round(seconds * 2) / 2);
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) => ({
      ...player,
      delaySeconds: delaySeconds === 0 ? undefined : delaySeconds,
    })),
  );
}

/** A click with the route tool: another waypoint, or a new points route when the old one was a pen stroke. */
export function addWaypoint(
  tactic: Tactic,
  at: StepAddress,
  slot: number,
  point: TacticPoint,
): Tactic {
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) => ({
      ...player,
      route:
        player.route.mode === 'points'
          ? { mode: 'points', points: [...player.route.points, point] }
          : { mode: 'points', points: [point] },
    })),
  );
}

/** Within this many world units a hand throw stands on a waypoint, and moves when it moves. */
const SAME_SPOT_UNITS = 2;

function isSameSpot(a: TacticPoint, b: TacticPoint): boolean {
  return Math.abs(a.x - b.x) <= SAME_SPOT_UNITS && Math.abs(a.y - b.y) <= SAME_SPOT_UNITS;
}

export function moveWaypoint(
  tactic: Tactic,
  at: StepAddress,
  slot: number,
  index: number,
  point: TacticPoint,
): Tactic {
  return editStep(tactic, at, (step) => {
    const previous = step.players.find((player) => player.slot === slot)?.route.points[index];
    const moved = editPlayer(step, slot, (player) => ({
      ...player,
      route: {
        ...player.route,
        points: player.route.points.map((existing, i) => (i === index ? point : existing)),
      },
    }));
    if (previous === undefined) return moved;
    const throws = moved.throws.map((thrown) =>
      thrown.throwerSlot === slot &&
      thrown.lineupId === undefined &&
      isSameSpot(thrown.from, previous)
        ? { ...thrown, from: point }
        : thrown,
    );
    return { ...moved, throws };
  });
}

/** Drops the last waypoint, or the one at `index`. */
export function removeWaypoint(
  tactic: Tactic,
  at: StepAddress,
  slot: number,
  index?: number,
): Tactic {
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) => {
      const target = index ?? player.route.points.length - 1;
      return {
        ...player,
        route: {
          ...player.route,
          points: player.route.points.filter((_, i) => i !== target),
        },
      };
    }),
  );
}

export function clearRoute(tactic: Tactic, at: StepAddress, slot: number): Tactic {
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) => ({
      ...player,
      route: { mode: player.route.mode, points: [] },
    })),
  );
}

export function setPenRoute(
  tactic: Tactic,
  at: StepAddress,
  slot: number,
  points: readonly TacticPoint[],
): Tactic {
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) => ({ ...player, route: { mode: 'pen', points } })),
  );
}

/** Another way to move starts the route over: a stroke and a list of waypoints do not translate. */
export function setRouteMode(
  tactic: Tactic,
  at: StepAddress,
  slot: number,
  mode: TacticRouteMode,
): Tactic {
  return editStep(tactic, at, (step) =>
    editPlayer(step, slot, (player) =>
      player.route.mode === mode ? player : { ...player, route: { mode, points: [] } },
    ),
  );
}

export function addThrow(tactic: Tactic, at: StepAddress, thrown: TacticThrow): Tactic {
  return editStep(tactic, at, (step) => ({ ...step, throws: [...step.throws, thrown] }));
}

/** Where on the thrower's route a hand throw leaves; a lineup keeps its own spot. */
export function setThrowFrom(
  tactic: Tactic,
  at: StepAddress,
  throwId: string,
  from: TacticPoint,
): Tactic {
  return editStep(tactic, at, (step) => ({
    ...step,
    throws: step.throws.map((thrown) =>
      thrown.id === throwId && thrown.lineupId === undefined ? { ...thrown, from } : thrown,
    ),
  }));
}

export function removeThrow(tactic: Tactic, at: StepAddress, throwId: string): Tactic {
  return editStep(tactic, at, (step) => ({
    ...step,
    throws: step.throws.filter((thrown) => thrown.id !== throwId),
  }));
}

/**
 * The thrower walks to the lineup's spot and throws from it: its origin is the route's next
 * waypoint, appended to a pen stroke as a straight stretch.
 */
export function addLineupThrow(
  tactic: Tactic,
  at: StepAddress,
  thrown: TacticThrow,
  origin: TacticPoint,
): Tactic {
  const withRoute = editStep(tactic, at, (step) =>
    editPlayer(step, thrown.throwerSlot, (player) => ({
      ...player,
      route: { ...player.route, points: [...player.route.points, origin] },
    })),
  );
  return addThrow(withRoute, at, thrown);
}

export function addStepAfter(tactic: Tactic, planId: string, index: number, slotCount: number) {
  return insertStep(tactic, planId, index + 1, newStep(slotCount));
}

export function deleteStep(tactic: Tactic, planId: string, index: number): Tactic {
  return removeStep(tactic, planId, index);
}

/** The gun a slot buys; `null` leaves the choice to the player. */
export function setWeapon(tactic: Tactic, slot: number, weapon: string | null): Tactic {
  const { [slot]: _previous, ...others } = tactic.weapons ?? {};
  const weapons = weapon === null ? others : { ...others, [slot]: weapon };
  return { ...tactic, weapons: Object.keys(weapons).length === 0 ? undefined : weapons };
}

/** Where a slot starts the round; another slot standing on that spot trades places. */
export function setSpawn(tactic: Tactic, slot: number, point: TacticPoint): Tactic {
  const previous = tactic.spawns[slot];
  const occupant = tactic.spawns.findIndex(
    (spawn, i) => i !== slot && spawn.x === point.x && spawn.y === point.y,
  );
  if (previous === undefined) return tactic;
  const spawns = tactic.spawns.map((spawn, i) => {
    if (i === slot) return point;
    return i === occupant ? previous : spawn;
  });
  return { ...tactic, spawns };
}
