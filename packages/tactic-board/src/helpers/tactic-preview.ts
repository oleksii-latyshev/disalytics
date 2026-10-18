import type { Tactic } from '@disa/demo-core';
import { effectiveSteps, rootPlan } from '@disa/demo-core';
import type { PlateActions } from '../hooks/use-tactic-plate-pointer';

/** `m:ss` counted up from the start, for a clock that does not count down from a round's length. */
export function formatElapsed(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The plan a preview plays: the root. A tactic read for viewing has no branch in hand. */
export function previewPlanId(tactic: Tactic): string {
  return rootPlan(tactic)?.id ?? '';
}

export function previewSteps(tactic: Tactic) {
  return effectiveSteps(tactic, previewPlanId(tactic));
}

/** What a plate does when nothing on it may be edited: only picking a player is kept. */
export function readOnlyActions(
  onSelect: (slot: number | null) => void,
  onInteract: () => void,
): PlateActions {
  const nothing = (): void => undefined;
  return {
    onSelect,
    onSelectEnemy: nothing,
    onPlaceEnemy: nothing,
    onMoveEnemy: nothing,
    onAddWaypoint: nothing,
    onMoveWaypoint: nothing,
    onPenStroke: nothing,
    onLineup: nothing,
    onHandThrow: nothing,
    onPickSpawn: nothing,
    onEndGesture: nothing,
    onInteract,
  };
}
