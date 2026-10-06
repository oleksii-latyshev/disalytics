import type { Lineup, TacticSide, TacticThrow, UtilityKind, WorldPoint } from '@disa/demo-core';
import { addThrowToStep } from './editor-actions';
import type { EditorStep } from './editor-tactic';
import { placeWithSpawnSwap } from './tactic-spawns';

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

/**
 * The thrower walks to the lineup's spot in this step and throws from it. With `spawns` (the
 * opening step), an origin at a spawn spot is that spot, and whoever stood there takes the
 * thrower's old place.
 */
export function addLineupThrowToStep(
  step: EditorStep,
  lineup: Lineup,
  throwerSlot: number,
  spawns: readonly WorldPoint[] = [],
): EditorStep {
  const placed = placeWithSpawnSwap(step, throwerSlot, lineup.origin, spawns);
  return addThrowToStep(placed, throwFromLineup(lineup, throwerSlot), throwerSlot).step;
}
