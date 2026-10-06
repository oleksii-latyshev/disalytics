import { isDrawingStroke, isFiniteNumber, isObject, isTacticThrow } from './tactic-guards';
import {
  isTacticRound,
  type Tactic,
  type TacticDrawingStroke,
  type TacticPoint,
  type TacticReadOptions,
  type TacticSide,
  type TacticStep,
  type TacticStepPlayer,
  type TacticThrow,
} from './tactics';

/** The tactic shape of file version 1: a flat list of steps, each holding where players stand. */

interface TacticV1Position {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly yaw?: number | undefined;
  readonly label?: string | undefined;
}

interface TacticV1Step {
  readonly id: string;
  readonly name: string;
  readonly timeOffsetSeconds: number;
  readonly players: readonly TacticV1Position[];
  readonly throws: readonly TacticThrow[];
  readonly drawings?: readonly TacticDrawingStroke[] | undefined;
  readonly notes?: string | undefined;
}

export interface TacticV1 {
  readonly id: string;
  readonly title: string;
  readonly map: string;
  readonly side: TacticSide;
  readonly rounds?: Tactic['rounds'];
  readonly steps: readonly TacticV1Step[];
  readonly author?: string | undefined;
  readonly description?: string | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

function isPosition(value: unknown): value is TacticV1Position {
  if (!isObject(value)) return false;
  if (!isFiniteNumber(value.slot) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return false;
  }
  if (value.yaw !== undefined && !isFiniteNumber(value.yaw)) return false;
  return value.label === undefined || typeof value.label === 'string';
}

function isStepV1(value: unknown): value is TacticV1Step {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false;
  if (!isFiniteNumber(value.timeOffsetSeconds)) return false;
  if (!Array.isArray(value.players) || !value.players.every(isPosition)) return false;
  if (!Array.isArray(value.throws) || !value.throws.every(isTacticThrow)) return false;
  if (
    value.drawings !== undefined &&
    !(Array.isArray(value.drawings) && value.drawings.every(isDrawingStroke))
  ) {
    return false;
  }
  return value.notes === undefined || typeof value.notes === 'string';
}

export function isTacticV1(value: unknown): value is TacticV1 {
  if (!isObject(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.map !== 'string'
  ) {
    return false;
  }
  if (value.side !== 'CT' && value.side !== 'T') return false;
  if (!Array.isArray(value.steps) || !value.steps.every(isStepV1)) return false;
  if (
    value.rounds !== undefined &&
    !(Array.isArray(value.rounds) && value.rounds.every(isTacticRound))
  ) {
    return false;
  }
  if (value.author !== undefined && typeof value.author !== 'string') return false;
  if (value.description !== undefined && typeof value.description !== 'string') return false;
  return isFiniteNumber(value.createdAt) && isFiniteNumber(value.updatedAt);
}

export const MAIN_PLAN_ID = 'main';

function spawnsOf(tactic: TacticV1, options: TacticReadOptions | undefined): TacticPoint[] {
  const resolved = options?.spawnsFor?.(tactic.map, tactic.side) ?? [];
  const slotCount =
    1 + Math.max(-1, ...tactic.steps.flatMap((step) => step.players.map((player) => player.slot)));
  const spawns: TacticPoint[] = [];
  for (let slot = 0; slot < slotCount; slot++) {
    const known = resolved[slot];
    if (known !== undefined) {
      spawns.push(known);
      continue;
    }
    const first = tactic.steps
      .flatMap((step) => step.players)
      .find((player) => player.slot === slot);
    spawns.push({ x: first?.x ?? 0, y: first?.y ?? 0 });
  }
  return spawns;
}

function stepOf(step: TacticV1Step, index: number): TacticStep {
  return {
    id: step.id,
    name: step.name,
    ...(step.notes === undefined ? {} : { idea: step.notes }),
    startsAt: index === 0 && step.timeOffsetSeconds === 0 ? null : step.timeOffsetSeconds,
    players: step.players.map(
      (player): TacticStepPlayer => ({
        slot: player.slot,
        route: { mode: 'points', points: [{ x: player.x, y: player.y }] },
        ...(player.yaw === undefined ? {} : { yaw: player.yaw }),
        ...(player.label === undefined ? {} : { label: player.label }),
      }),
    ),
    throws: step.throws,
    ...(step.drawings === undefined ? {} : { drawings: step.drawings }),
  };
}

/**
 * A version 1 tactic as one root plan: each step's player position becomes a one-point route, a
 * step's offset pins its start unless it is the opening step at zero, and a step's notes become its
 * idea. Spawns come from `options.spawnsFor`, else from where the first step put each player.
 */
export function migrateTacticV1(tactic: TacticV1, options?: TacticReadOptions): Tactic {
  return {
    id: tactic.id,
    title: tactic.title,
    map: tactic.map,
    side: tactic.side,
    ...(tactic.rounds === undefined ? {} : { rounds: tactic.rounds }),
    ...(tactic.author === undefined ? {} : { author: tactic.author }),
    ...(tactic.description === undefined ? {} : { description: tactic.description }),
    createdAt: tactic.createdAt,
    updatedAt: tactic.updatedAt,
    spawns: spawnsOf(tactic, options),
    plans: [
      {
        id: MAIN_PLAN_ID,
        condition: tactic.title,
        parentId: null,
        forkAfter: 0,
        deaths: {},
        steps: tactic.steps.map(stepOf),
      },
    ],
  };
}
