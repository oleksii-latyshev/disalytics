import type { Lineup, UtilityKind } from '@disa/demo-core';
import type { EditorStep } from './editor-tactic';

export interface StepThrowRow {
  readonly id: string;
  readonly kind: UtilityKind;
  /** The lineup it was taken from, when it came from one. */
  readonly lineupTitle: string | undefined;
  readonly slot: number;
  /** The thrower's role or name, empty when none was given. */
  readonly label: string;
  readonly releaseTime: number;
  /** The teammate who buys and drops it, when it is not the thrower's own. */
  readonly droppedBy: number | undefined;
}

/** What the step rail lists for a step: its throws with the thrower and lineup resolved. */
export function stepThrowRows(
  step: EditorStep | undefined,
  lineups: readonly Pick<Lineup, 'id' | 'title'>[],
): readonly StepThrowRow[] {
  if (step === undefined) return [];
  return step.throws.map((thrown) => ({
    id: thrown.id,
    kind: thrown.kind,
    lineupTitle:
      thrown.lineupId === undefined
        ? undefined
        : lineups.find((lineup) => lineup.id === thrown.lineupId)?.title,
    slot: thrown.throwerSlot,
    label: step.players.find((player) => player.slot === thrown.throwerSlot)?.label?.trim() ?? '',
    releaseTime: thrown.releaseTime,
    droppedBy: thrown.droppedBy,
  }));
}
