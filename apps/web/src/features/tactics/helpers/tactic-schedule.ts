import {
  deadAt,
  effectiveSteps,
  type Tactic,
  type TacticStep,
  type TacticStepPlayer,
  type TacticThrow,
  type UtilityKind,
  weaponMaxSpeed,
} from '@disa/demo-core';
import type { MapOverview, NavGrid, RadarPoint } from '@disa/map-data';
import { toRadar, walkRoute } from './tactic-route';

/** A rifle in hand: what a player carrying the round's utility runs at, in world units a second. */
export const TACTIC_RUN_SPEED_UNITS = weaponMaxSpeed('AK-47');

/** How long a competitive round runs once it is live; a pinned step is placed on this clock. */
export const TACTIC_ROUND_SECONDS = 115;

export const GRENADE_FLIGHT_SECONDS = 1.1;
export const THROW_WINDUP_SECONDS = 0.4;
export const MIN_STEP_SECONDS = 2;
/** A step starting this much before the last one finished counts as pinned too early. */
const LATE_TOLERANCE_SECONDS = 0.05;

/** How long a landed grenade stays on the map, in seconds. */
export const UTILITY_LIFE_SECONDS: Readonly<Record<UtilityKind, number>> = {
  smoke: 18,
  fire: 7,
  flash: 2.5,
  he: 1.5,
  decoy: 15,
  kit: 0,
};

export interface PlayerLeg {
  readonly slot: number;
  readonly isDead: boolean;
  /** Radar pixels along the walked route; the first is where the step starts. */
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  /** Distance from the start to each point, in radar pixels. */
  readonly cum: Float64Array;
  readonly lengthPx: number;
  /** Segment indices drawn straight because the grid could not join them. */
  readonly breaks: readonly number[];
  readonly delaySeconds: number;
  readonly runSeconds: number;
  /** Seconds after the step starts at which the player stands at the end. */
  readonly arriveSeconds: number;
}

export interface ScheduledThrow {
  readonly id: string;
  readonly stepIndex: number;
  readonly slot: number;
  readonly kind: UtilityKind;
  readonly lineupId: string | undefined;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  /** Seconds on the plan's clock. */
  readonly releaseAt: number;
  readonly landAt: number;
}

export interface StepSchedule {
  readonly index: number;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly endSeconds: number;
  /** The step is pinned to a time earlier than the one the step before it finishes. */
  readonly isLate: boolean;
  /** Indexed by slot. */
  readonly legs: readonly PlayerLeg[];
  readonly throws: readonly ScheduledThrow[];
}

export interface TacticSchedule {
  readonly slotCount: number;
  readonly speedPxPerSecond: number;
  readonly steps: readonly StepSchedule[];
  readonly throws: readonly ScheduledThrow[];
  readonly totalSeconds: number;
}

export interface ScheduleInput {
  readonly overview: MapOverview;
  readonly grid: NavGrid | undefined;
  readonly tactic: Tactic;
  readonly planId: string;
}

function distance(a: RadarPoint, b: RadarPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildLeg(
  input: ScheduleInput,
  slot: number,
  start: RadarPoint,
  entry: TacticStepPlayer | undefined,
  isDead: boolean,
  speedPxPerSecond: number,
): PlayerLeg {
  const delaySeconds = isDead ? 0 : Math.max(0, entry?.delaySeconds ?? 0);
  const walked =
    isDead || entry === undefined
      ? { points: [start], breaks: [] as readonly number[] }
      : walkRoute(input.overview, input.grid, start, entry.route);

  const count = walked.points.length;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const cum = new Float64Array(count);
  walked.points.forEach((point, i) => {
    xs[i] = point.x;
    ys[i] = point.y;
    const previous = walked.points[i - 1];
    cum[i] = previous === undefined ? 0 : (cum[i - 1] ?? 0) + distance(previous, point);
  });

  const lengthPx = cum[count - 1] ?? 0;
  const runSeconds = lengthPx / speedPxPerSecond;
  return {
    slot,
    isDead,
    xs,
    ys,
    cum,
    lengthPx,
    breaks: walked.breaks,
    delaySeconds,
    runSeconds,
    arriveSeconds: delaySeconds + runSeconds,
  };
}

function writePoint(leg: PlayerLeg, index: number, out: Float64Array, offset: number): void {
  out[offset] = leg.xs[index] ?? 0;
  out[offset + 1] = leg.ys[index] ?? 0;
}

/**
 * Where the leg is `seconds` after the step starts, written into `out` at `offset`.
 *
 * perf: read every animation frame while the plan plays — writes into the caller's buffer.
 */
export function readLegPosition(
  leg: PlayerLeg,
  seconds: number,
  speedPxPerSecond: number,
  out: Float64Array,
  offset: number,
): void {
  const last = leg.xs.length - 1;
  const travelled = (seconds - leg.delaySeconds) * speedPxPerSecond;
  if (travelled <= 0 || last === 0) {
    writePoint(leg, 0, out, offset);
    return;
  }
  if (travelled >= leg.lengthPx) {
    writePoint(leg, last, out, offset);
    return;
  }

  let i = 1;
  while (i < last && (leg.cum[i] ?? 0) < travelled) i++;
  const before = leg.cum[i - 1] ?? 0;
  const span = (leg.cum[i] ?? 0) - before;
  const fraction = span > 0 ? (travelled - before) / span : 0;
  const ax = leg.xs[i - 1] ?? 0;
  const ay = leg.ys[i - 1] ?? 0;
  out[offset] = ax + ((leg.xs[i] ?? 0) - ax) * fraction;
  out[offset + 1] = ay + ((leg.ys[i] ?? 0) - ay) * fraction;
}

/** Index of the route point a throw happens at: the vertex nearest to where it is thrown from. */
function nearestVertex(leg: PlayerLeg, x: number, y: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < leg.xs.length; i++) {
    const d = Math.hypot((leg.xs[i] ?? 0) - x, (leg.ys[i] ?? 0) - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

interface ThrowTimes {
  readonly releaseLocal: number;
  readonly landLocal: number;
}

interface ThrowSpot {
  readonly from: RadarPoint;
  /** The route point the thrower stands on when the grenade leaves. */
  readonly vertex: number;
}

/**
 * A lineup leaves from its own spot, which the route runs through. A hand throw leaves from the
 * point of the walked route nearest to where it was placed, and the player walks on after it.
 */
function throwSpot(thrown: TacticThrow, leg: PlayerLeg, overview: MapOverview): ThrowSpot {
  const placed = toRadar(overview, thrown.from);
  const vertex = nearestVertex(leg, placed.x, placed.y);
  if (thrown.lineupId !== undefined) return { from: placed, vertex };
  return { from: { x: leg.xs[vertex] ?? 0, y: leg.ys[vertex] ?? 0 }, vertex };
}

function throwTimes(
  thrown: TacticThrow,
  leg: PlayerLeg,
  vertex: number,
  speedPxPerSecond: number,
): ThrowTimes {
  const standsAt = leg.delaySeconds + (leg.cum[vertex] ?? 0) / speedPxPerSecond;
  const releaseLocal = standsAt + THROW_WINDUP_SECONDS + Math.max(0, thrown.releaseTime);
  return { releaseLocal, landLocal: releaseLocal + GRENADE_FLIGHT_SECONDS };
}

function stepThrows(
  input: ScheduleInput,
  step: TacticStep,
  stepIndex: number,
  legs: readonly PlayerLeg[],
  speedPxPerSecond: number,
): readonly { readonly throwData: ScheduledThrow; readonly landLocal: number }[] {
  const scheduled: { readonly throwData: ScheduledThrow; readonly landLocal: number }[] = [];
  for (const thrown of step.throws) {
    const leg = legs[thrown.throwerSlot];
    if (leg === undefined || leg.isDead) continue;
    const { from, vertex } = throwSpot(thrown, leg, input.overview);
    const to = toRadar(input.overview, thrown.to);
    const times = throwTimes(thrown, leg, vertex, speedPxPerSecond);
    scheduled.push({
      landLocal: times.landLocal,
      throwData: {
        id: thrown.id,
        stepIndex,
        slot: thrown.throwerSlot,
        kind: thrown.kind,
        lineupId: thrown.lineupId,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        releaseAt: times.releaseLocal,
        landAt: times.landLocal,
      },
    });
  }
  return scheduled;
}

function placeThrows(
  scheduled: readonly { readonly throwData: ScheduledThrow; readonly landLocal: number }[],
  startSeconds: number,
): readonly ScheduledThrow[] {
  return scheduled.map(({ throwData }) => ({
    ...throwData,
    releaseAt: startSeconds + throwData.releaseAt,
    landAt: startSeconds + throwData.landAt,
  }));
}

/**
 * The plan played out: for every step, where each player runs, when they get there and when each
 * grenade leaves and lands, on one clock that counts from the round going live. A step starts when
 * the one before it ends, or at its pinned time if that is later.
 */
export function buildSchedule(input: ScheduleInput): TacticSchedule {
  const { overview, tactic, planId } = input;
  const slotCount = tactic.spawns.length;
  const speedPxPerSecond = TACTIC_RUN_SPEED_UNITS / overview.scale;
  const steps = effectiveSteps(tactic, planId);
  const dead = deadAt(tactic, planId);

  let standing: RadarPoint[] = tactic.spawns.map((spawn) => toRadar(overview, spawn));
  let previousEnd = 0;
  const stepSchedules: StepSchedule[] = [];
  const allThrows: ScheduledThrow[] = [];

  steps.forEach((step, index) => {
    const legs = standing.map((start, slot) =>
      buildLeg(
        input,
        slot,
        start,
        step.players.find((player) => player.slot === slot),
        dead[slot] !== undefined && index >= (dead[slot] ?? 0),
        speedPxPerSecond,
      ),
    );

    const scheduled = stepThrows(input, step, index, legs, speedPxPerSecond);
    const durationSeconds = Math.max(
      MIN_STEP_SECONDS,
      ...legs.map((leg) => leg.arriveSeconds),
      ...scheduled.map((entry) => entry.landLocal),
    );

    const pinned = step.startsAt;
    const startSeconds = pinned === null ? previousEnd : Math.max(previousEnd, pinned);
    const isLate = pinned !== null && pinned < previousEnd - LATE_TOLERANCE_SECONDS;
    const placed = placeThrows(scheduled, startSeconds);
    const endSeconds = startSeconds + durationSeconds;

    stepSchedules.push({
      index,
      startSeconds,
      durationSeconds,
      endSeconds,
      isLate,
      legs,
      throws: placed,
    });
    allThrows.push(...placed);
    previousEnd = endSeconds;
    standing = legs.map((leg) => ({
      x: leg.xs[leg.xs.length - 1] ?? 0,
      y: leg.ys[leg.ys.length - 1] ?? 0,
    }));
  });

  return {
    slotCount,
    speedPxPerSecond,
    steps: stepSchedules,
    throws: allThrows,
    totalSeconds: previousEnd,
  };
}

/** The step a plan-clock time falls in: the last one that has started. */
export function stepIndexAt(schedule: TacticSchedule, seconds: number): number {
  let index = 0;
  for (let i = 1; i < schedule.steps.length; i++) {
    if ((schedule.steps[i]?.startSeconds ?? Number.POSITIVE_INFINITY) <= seconds) index = i;
  }
  return index;
}

/** `m:ss` on a clock that counts down from the round's length, as the game's own does. */
export function formatRoundClock(seconds: number): string {
  const left = Math.max(0, Math.round(TACTIC_ROUND_SECONDS - seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
