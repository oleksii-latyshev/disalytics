/**
 * The plate's own short animations — tokens gliding to a new step, a handle or grenade popping in,
 * dashes marching — as plain mutable state the layer reads when it paints. None of it is React
 * state, and none of it runs while the plan plays: that is the frame clock's.
 */

export const TOKEN_GLIDE_MS = 280;
export const POP_MS = 340;

export interface TacticMotion {
  glideStartMs: number;
  readonly fromX: Float64Array;
  readonly fromY: Float64Array;
  /** Where each token was drawn last, which is where the next glide starts from. */
  readonly lastX: Float64Array;
  readonly lastY: Float64Array;
  /** When each keyed mark first appeared; a mark seen while priming never pops. */
  readonly appearedAt: Map<string, number>;
  isPriming: boolean;
  isReduced: boolean;
}

export function createMotion(slotCount: number): TacticMotion {
  return {
    glideStartMs: Number.NEGATIVE_INFINITY,
    fromX: new Float64Array(slotCount),
    fromY: new Float64Array(slotCount),
    lastX: new Float64Array(slotCount),
    lastY: new Float64Array(slotCount),
    appearedAt: new Map(),
    isPriming: true,
    isReduced: false,
  };
}

/** Called when the board shows another step: tokens glide from where they were, marks are not new. */
export function startGlide(motion: TacticMotion, nowMs: number): void {
  motion.fromX.set(motion.lastX);
  motion.fromY.set(motion.lastY);
  motion.glideStartMs = motion.isReduced ? Number.NEGATIVE_INFINITY : nowMs;
  motion.appearedAt.clear();
  motion.isPriming = true;
}

export function glideProgress(motion: TacticMotion, nowMs: number): number {
  const t = (nowMs - motion.glideStartMs) / TOKEN_GLIDE_MS;
  if (t >= 1) return 1;
  return 1 - (1 - t) * (1 - t);
}

/** Scale of a mark that appeared recently: overshoots, then settles at 1. */
export function popScale(motion: TacticMotion, key: string, nowMs: number): number {
  const seen = motion.appearedAt.get(key);
  if (seen === undefined) {
    motion.appearedAt.set(
      key,
      motion.isPriming || motion.isReduced ? Number.NEGATIVE_INFINITY : nowMs,
    );
    return motion.isPriming || motion.isReduced ? 1 : 0.4;
  }
  const t = (nowMs - seen) / POP_MS;
  if (t >= 1) return 1;
  return t < 0.7 ? 0.4 + (1.12 - 0.4) * (t / 0.7) : 1.12 - 0.12 * ((t - 0.7) / 0.3);
}

export function isAnimating(motion: TacticMotion, nowMs: number): boolean {
  if (motion.isReduced) return false;
  if (nowMs - motion.glideStartMs < TOKEN_GLIDE_MS) return true;
  for (const seen of motion.appearedAt.values()) if (nowMs - seen < POP_MS) return true;
  return false;
}
