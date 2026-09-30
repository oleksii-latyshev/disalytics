import type { Lineup } from '@disa/demo-core';

/** A saved edit of a built-in lineup keeps its ID and takes precedence over the bundled copy. */
export function combineLineups(
  customLineups: readonly Lineup[],
  builtInLineups: readonly Lineup[],
): readonly Lineup[] {
  const customIds = new Set(customLineups.map((lineup) => lineup.id));
  return [...customLineups, ...builtInLineups.filter((lineup) => !customIds.has(lineup.id))];
}
