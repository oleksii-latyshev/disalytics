import type { Lineup, TacticStep, UtilityKind } from '@disa/demo-core';

export interface StepThrowRow {
  readonly id: string;
  readonly kind: UtilityKind;
  /** The lineup it was taken from, when it came from one. */
  readonly lineupTitle: string | undefined;
  readonly slot: number;
  /** The thrower's role or name, empty when none was given. */
  readonly label: string;
  readonly releaseTime: number;
}

/** What the step rail lists for a step: its throws with the thrower and lineup resolved. */
export function stepThrowRows(
  step: TacticStep | undefined,
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
  }));
}
