import { TACTIC_ROUNDS, type TacticRound, type UtilityKind } from '@disa/demo-core';
import type { EditorStep } from './editor-tactic';

export interface StepSegment {
  readonly index: number;
  /** Where the segment starts and how wide it is, as a share of the timeline. */
  readonly startPercent: number;
  readonly widthPercent: number;
}

export interface ThrowMarker {
  readonly id: string;
  readonly kind: UtilityKind;
  readonly seconds: number;
  readonly percent: number;
}

function percentOf(seconds: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (seconds / total) * 100));
}

/** Each step runs from its own offset to the next step's, the last one to the end of the tactic. */
export function stepSegments(steps: readonly EditorStep[], total: number): readonly StepSegment[] {
  return steps.map((step, index) => {
    const start = percentOf(step.timeOffsetSeconds, total);
    const next = steps[index + 1];
    const end = next === undefined ? 100 : percentOf(next.timeOffsetSeconds, total);
    return { index, startPercent: start, widthPercent: Math.max(0, end - start) };
  });
}

/** A throw leaves its thrower `releaseTime` seconds after its step begins. */
export function throwMarkers(steps: readonly EditorStep[], total: number): readonly ThrowMarker[] {
  return steps.flatMap((step) =>
    step.throws.map((thrown) => {
      const seconds = step.timeOffsetSeconds + thrown.releaseTime;
      return { id: thrown.id, kind: thrown.kind, seconds, percent: percentOf(seconds, total) };
    }),
  );
}

/** `m:ss`, the way a round clock reads. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The round types in the order the editor offers them, or nothing when any round will do. */
export function calledOnRounds(rounds: readonly TacticRound[] | undefined): string | undefined {
  const picked = TACTIC_ROUNDS.filter((round) => rounds?.includes(round) === true);
  return picked.length === 0 ? undefined : picked.join(', ');
}
