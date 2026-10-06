import {
  GRENADE_KINDS,
  type GrenadeCounts,
  type GrenadeKind,
  type TacticStep,
} from '@disa/demo-core';

/** The grenades each player throws in a step, by slot. */
export function stepGrenadeCounts(step: TacticStep | undefined, slot: number): GrenadeCounts {
  const counts: Record<GrenadeKind, number> = { he: 0, flash: 0, smoke: 0, fire: 0, decoy: 0 };
  for (const thrown of step?.throws ?? []) {
    if (thrown.throwerSlot !== slot) continue;
    for (const kind of GRENADE_KINDS) if (kind === thrown.kind) counts[kind] += 1;
  }
  return counts;
}
