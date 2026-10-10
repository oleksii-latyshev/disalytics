import type { Lineup, TacticSide, TacticThrow, UtilityKind } from '@disa/demo-core';

/** The lineups worth offering: the tactic's side (or both) and the kind being placed. */
export function selectableLineups(
  lineups: readonly Lineup[],
  side: TacticSide,
  kind: UtilityKind,
): readonly Lineup[] {
  return lineups.filter(
    (lineup) => lineup.kind === kind && (lineup.side === 'BOTH' || lineup.side === side),
  );
}

export function throwFromLineup(lineup: Lineup, throwerSlot: number): Omit<TacticThrow, 'id'> {
  return {
    throwerSlot,
    kind: lineup.kind,
    from: { x: lineup.origin.x, y: lineup.origin.y, z: lineup.origin.z },
    to: { x: lineup.landing.x, y: lineup.landing.y, z: lineup.landing.z },
    releaseTime: 0,
    lineupId: lineup.id,
  };
}
