import type { Lineup } from '@disa/demo-core';
import type { SavedTarget } from './lineup-targets';

/** What can be done to the targets the reader has ticked. */
export interface Bulk {
  /** Every lineup of the ticked targets. */
  readonly lineups: readonly Lineup[];
  /** Two targets or more can be made one by sharing a landing. */
  readonly canMergeLandings: boolean;
  /** Any two ticked lineups can share a throw spot: the reader chose them. */
  readonly canMergeOrigins: boolean;
  readonly canUngroupLandings: boolean;
  readonly canUngroupOrigins: boolean;
  /** The user's own; a built-in is not deleted, only copied by an edit. */
  readonly deletable: readonly Lineup[];
}

export function bulkOf(targets: readonly SavedTarget[]): Bulk {
  const lineups = targets.flatMap((target) => target.variants.map(({ lineup }) => lineup));

  return {
    lineups,
    canMergeLandings: targets.length >= 2,
    canMergeOrigins: lineups.length >= 2,
    canUngroupLandings: lineups.some((lineup) => lineup.groupId !== undefined),
    canUngroupOrigins: lineups.some((lineup) => lineup.originGroupId !== undefined),
    deletable: lineups.filter((lineup) => lineup.isBuiltIn !== true),
  };
}
