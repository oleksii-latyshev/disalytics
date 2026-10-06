import type { UtilityKind } from '@disa/demo-core';
import {
  GRENADE_FLIGHT_SECONDS,
  readLegPosition,
  type ScheduledThrow,
  type StepSchedule,
  stepIndexAt,
  type TacticSchedule,
  UTILITY_LIFE_SECONDS,
} from './tactic-schedule';

/** Everything drawn at one moment of playback, in buffers made once per schedule. */
export interface TacticScene {
  stepIndex: number;
  readonly playerX: Float64Array;
  readonly playerY: Float64Array;
  readonly isDead: Uint8Array;
  flightCount: number;
  readonly flightX: Float64Array;
  readonly flightY: Float64Array;
  readonly flightKind: UtilityKind[];
  areaCount: number;
  readonly areaX: Float64Array;
  readonly areaY: Float64Array;
  /** Seconds since the grenade landed. */
  readonly areaAge: Float64Array;
  readonly areaKind: UtilityKind[];
}

export function createScene(schedule: TacticSchedule): TacticScene {
  const capacity = Math.max(1, schedule.throws.length);
  return {
    stepIndex: 0,
    playerX: new Float64Array(schedule.slotCount),
    playerY: new Float64Array(schedule.slotCount),
    isDead: new Uint8Array(schedule.slotCount),
    flightCount: 0,
    flightX: new Float64Array(capacity),
    flightY: new Float64Array(capacity),
    flightKind: new Array<UtilityKind>(capacity).fill('smoke'),
    areaCount: 0,
    areaX: new Float64Array(capacity),
    areaY: new Float64Array(capacity),
    areaAge: new Float64Array(capacity),
    areaKind: new Array<UtilityKind>(capacity).fill('smoke'),
  };
}

const POSITION = new Float64Array(2);
const ARC_BEND = 0.16;

function sampleLegs(
  schedule: TacticSchedule,
  step: StepSchedule,
  seconds: number,
  scene: TacticScene,
): void {
  const local = seconds - step.startSeconds;
  for (let slot = 0; slot < schedule.slotCount; slot++) {
    const leg = step.legs[slot];
    if (leg === undefined) continue;
    readLegPosition(leg, local, schedule.speedPxPerSecond, POSITION, 0);
    scene.playerX[slot] = POSITION[0] ?? 0;
    scene.playerY[slot] = POSITION[1] ?? 0;
    scene.isDead[slot] = leg.isDead ? 1 : 0;
  }
}

/** A grenade a fraction of the way along its arc, which bends a sixth of its length to one side. */
function writeFlight(thrown: ScheduledThrow, fraction: number, scene: TacticScene, i: number) {
  const dx = thrown.toX - thrown.fromX;
  const dy = thrown.toY - thrown.fromY;
  const length = Math.hypot(dx, dy) || 1;
  const controlX = (thrown.fromX + thrown.toX) / 2 - (dy / length) * ARC_BEND * length;
  const controlY = (thrown.fromY + thrown.toY) / 2 + (dx / length) * ARC_BEND * length;
  const u = 1 - fraction;
  scene.flightX[i] =
    u * u * thrown.fromX + 2 * u * fraction * controlX + fraction * fraction * thrown.toX;
  scene.flightY[i] =
    u * u * thrown.fromY + 2 * u * fraction * controlY + fraction * fraction * thrown.toY;
  scene.flightKind[i] = thrown.kind;
}

function sampleThrows(schedule: TacticSchedule, seconds: number, scene: TacticScene): void {
  let flights = 0;
  let areas = 0;
  for (let i = 0; i < schedule.throws.length; i++) {
    const thrown = schedule.throws[i];
    if (thrown === undefined || seconds < thrown.releaseAt) continue;

    if (seconds < thrown.landAt) {
      writeFlight(thrown, (seconds - thrown.releaseAt) / GRENADE_FLIGHT_SECONDS, scene, flights);
      flights++;
      continue;
    }

    const age = seconds - thrown.landAt;
    if (age >= UTILITY_LIFE_SECONDS[thrown.kind]) continue;
    scene.areaX[areas] = thrown.toX;
    scene.areaY[areas] = thrown.toY;
    scene.areaAge[areas] = age;
    scene.areaKind[areas] = thrown.kind;
    areas++;
  }
  scene.flightCount = flights;
  scene.areaCount = areas;
}

/**
 * Reads the schedule at a time on the plan's clock into `scene`.
 *
 * perf: called every animation frame while the plan plays — no allocation, no closures, only the
 * buffers the scene already holds.
 */
export function sampleScene(schedule: TacticSchedule, seconds: number, scene: TacticScene): void {
  const stepIndex = stepIndexAt(schedule, seconds);
  const step = schedule.steps[stepIndex];
  scene.stepIndex = stepIndex;
  if (step === undefined) return;
  sampleLegs(schedule, step, seconds, scene);
  sampleThrows(schedule, seconds, scene);
}
