import type {
  TacticDrawingStroke,
  TacticPlayerPosition,
  TacticPoint,
  TacticStep,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';

/** Duration of a grenade in flight in seconds. */
export const GRENADE_FLIGHT_DURATION = 2.0;

/** Duration in seconds that a deployed utility remains active on the map. */
export const UTILITY_ACTIVE_DURATIONS: Readonly<Record<UtilityKind, number>> = {
  smoke: 18.0,
  fire: 7.0,
  flash: 2.5,
  he: 1.5,
  decoy: 15.0,
  kit: 0,
};

/** Shortest-arc interpolation of degrees, handling 360-degree wrapping. */
export function interpolateAngleDeg(a: number, b: number, t: number): number {
  let diff = (b - a) % 360;
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }
  return a + diff * t;
}

/** 2D point along a quadratic bezier curve. */
export function quadraticBezierPoint(
  p0: { readonly x: number; readonly y: number },
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
  t: number,
): { readonly x: number; readonly y: number } {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
    y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y,
  };
}

export interface InterpolatedGrenadeFlight {
  readonly throwId: string;
  readonly kind: UtilityKind;
  readonly throwerSlot: number;
  readonly currentPos: { readonly x: number; readonly y: number };
  readonly progress: number;
  readonly from: TacticPoint;
  readonly to: TacticPoint;
}

export interface InterpolatedUtilityActive {
  readonly throwId: string;
  readonly kind: UtilityKind;
  readonly position: TacticPoint;
  readonly elapsedSinceLanding: number;
  readonly totalDuration: number;
}

export interface InterpolatedTacticState {
  readonly players: readonly TacticPlayerPosition[];
  readonly activeStepIndex: number;
  readonly flyingGrenades: readonly InterpolatedGrenadeFlight[];
  readonly activeUtilities: readonly InterpolatedUtilityActive[];
  readonly drawings: readonly TacticDrawingStroke[];
  readonly visibleThrows: readonly TacticThrow[];
}

const EMPTY_INTERPOLATED_STATE: InterpolatedTacticState = {
  players: [],
  activeStepIndex: 0,
  flyingGrenades: [],
  activeUtilities: [],
  drawings: [],
  visibleThrows: [],
};

/**
 * Calculates curved control point for parabolic grenade trajectory.
 */
export function grenadeControlPoint(
  from: TacticPoint,
  to: TacticPoint,
): { readonly x: number; readonly y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) {
    return { x: from.x, y: from.y };
  }

  const nx = -dy / dist;
  const ny = dx / dist;
  const curveOffset = dist * 0.15;
  return {
    x: (from.x + to.x) / 2 + nx * curveOffset,
    y: (from.y + to.y) / 2 + ny * curveOffset,
  };
}

function findActiveStepIndex(steps: readonly TacticStep[], currentTime: number): number {
  for (let i = 0; i < steps.length - 1; i++) {
    const s = steps[i];
    const nextS = steps[i + 1];
    if (s !== undefined && nextS !== undefined) {
      if (currentTime >= s.timeOffsetSeconds && currentTime < nextS.timeOffsetSeconds) {
        return i;
      }
      if (i === steps.length - 2 && currentTime >= nextS.timeOffsetSeconds) {
        return i + 1;
      }
    }
  }
  return 0;
}

function interpolatePlayerPair(
  pA: TacticPlayerPosition,
  pB: TacticPlayerPosition | undefined,
  t: number,
): TacticPlayerPosition {
  if (pB === undefined) return pA;

  const x = pA.x + (pB.x - pA.x) * t;
  const y = pA.y + (pB.y - pA.y) * t;
  let yaw: number | undefined;
  if (pA.yaw !== undefined && pB.yaw !== undefined) {
    yaw = interpolateAngleDeg(pA.yaw, pB.yaw, t);
  } else {
    yaw = pB.yaw ?? pA.yaw;
  }

  return {
    slot: pA.slot,
    x,
    y,
    ...(yaw !== undefined ? { yaw } : {}),
    ...(pB.label !== undefined
      ? { label: pB.label }
      : pA.label !== undefined
        ? { label: pA.label }
        : {}),
  };
}

function interpolatePlayers(
  stepA: TacticStep,
  stepB: TacticStep,
  currentTime: number,
): readonly TacticPlayerPosition[] {
  const span = stepB.timeOffsetSeconds - stepA.timeOffsetSeconds;
  const t = span > 0 ? Math.max(0, Math.min(1, (currentTime - stepA.timeOffsetSeconds) / span)) : 0;

  const playerMapB = new Map<number, TacticPlayerPosition>();
  for (const p of stepB.players) {
    playerMapB.set(p.slot, p);
  }

  const merged: TacticPlayerPosition[] = [];
  const handledSlots = new Set<number>();

  for (const pA of stepA.players) {
    handledSlots.add(pA.slot);
    merged.push(interpolatePlayerPair(pA, playerMapB.get(pA.slot), t));
  }

  for (const pB of stepB.players) {
    if (!handledSlots.has(pB.slot)) {
      merged.push(pB);
    }
  }

  return merged;
}

function checkThrowProjectile(
  releaseTime: number,
  tacticThrow: TacticThrow,
  currentTime: number,
  flying: InterpolatedGrenadeFlight[],
  active: InterpolatedUtilityActive[],
): void {
  const dt = currentTime - releaseTime;

  if (dt >= 0 && dt < GRENADE_FLIGHT_DURATION) {
    const flightT = dt / GRENADE_FLIGHT_DURATION;
    const ctrl = grenadeControlPoint(tacticThrow.from, tacticThrow.to);
    const currentPos = quadraticBezierPoint(tacticThrow.from, ctrl, tacticThrow.to, flightT);

    flying.push({
      throwId: tacticThrow.id,
      kind: tacticThrow.kind,
      throwerSlot: tacticThrow.throwerSlot,
      currentPos,
      progress: flightT,
      from: tacticThrow.from,
      to: tacticThrow.to,
    });
  } else if (dt >= GRENADE_FLIGHT_DURATION) {
    const activeDuration = UTILITY_ACTIVE_DURATIONS[tacticThrow.kind];
    const elapsedSinceLanding = dt - GRENADE_FLIGHT_DURATION;

    if (elapsedSinceLanding < activeDuration) {
      active.push({
        throwId: tacticThrow.id,
        kind: tacticThrow.kind,
        position: tacticThrow.to,
        elapsedSinceLanding,
        totalDuration: activeDuration,
      });
    }
  }
}

function collectActiveProjectiles(
  steps: readonly TacticStep[],
  maxStepIndex: number,
  currentTime: number,
): {
  readonly flying: readonly InterpolatedGrenadeFlight[];
  readonly active: readonly InterpolatedUtilityActive[];
} {
  const flying: InterpolatedGrenadeFlight[] = [];
  const active: InterpolatedUtilityActive[] = [];

  for (let sIdx = 0; sIdx <= maxStepIndex; sIdx++) {
    const s = steps[sIdx];
    if (s === undefined) continue;

    for (const tacticThrow of s.throws) {
      checkThrowProjectile(
        s.timeOffsetSeconds + tacticThrow.releaseTime,
        tacticThrow,
        currentTime,
        flying,
        active,
      );
    }
  }

  return { flying, active };
}

/**
 * Smoothly interpolates players, in-flight grenades, active utility halos,
 * and step annotations at a given playback timestamp.
 */
export function interpolateTacticStep(
  steps: readonly TacticStep[],
  currentTime: number,
): InterpolatedTacticState {
  if (steps.length === 0) return EMPTY_INTERPOLATED_STATE;

  const firstStep = steps[0];
  if (firstStep === undefined) return EMPTY_INTERPOLATED_STATE;

  if (steps.length === 1 || currentTime <= firstStep.timeOffsetSeconds) {
    return {
      players: firstStep.players,
      activeStepIndex: 0,
      flyingGrenades: [],
      activeUtilities: [],
      drawings: firstStep.drawings ?? [],
      visibleThrows: firstStep.throws,
    };
  }

  const lastStep = steps[steps.length - 1];
  if (lastStep === undefined) return EMPTY_INTERPOLATED_STATE;

  const activeIndex = findActiveStepIndex(steps, currentTime);

  let players: readonly TacticPlayerPosition[];
  if (activeIndex >= steps.length - 1) {
    players = lastStep.players;
  } else {
    const stepA = steps[activeIndex];
    const stepB = steps[activeIndex + 1];
    players =
      stepA !== undefined && stepB !== undefined
        ? interpolatePlayers(stepA, stepB, currentTime)
        : lastStep.players;
  }

  const activeStep = steps[activeIndex] ?? firstStep;
  const { flying, active } = collectActiveProjectiles(steps, activeIndex, currentTime);

  return {
    players,
    activeStepIndex: activeIndex,
    flyingGrenades: flying,
    activeUtilities: active,
    drawings: activeStep.drawings ?? [],
    visibleThrows: activeStep.throws,
  };
}
