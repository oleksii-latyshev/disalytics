import { isBuiltInCopy, type Lineup } from '@disa/demo-core';
import { loadBuiltIns } from './built-ins';

/**
 * A saved edit of a built-in lineup keeps its ID and takes precedence over the bundled copy; a stored
 * copy nobody changed is the built-in itself.
 */
export function combineLineups(
  customLineups: readonly Lineup[],
  builtInLineups: readonly Lineup[],
): readonly Lineup[] {
  const ownLineups = withoutBuiltInCopies(customLineups, builtInLineups);
  const ownIds = new Set(ownLineups.map((lineup) => lineup.id));
  return [...ownLineups, ...builtInLineups.filter((lineup) => !ownIds.has(lineup.id))];
}

/** The lineups that are the user's own: everything but unchanged copies of a built-in. */
export function withoutBuiltInCopies(
  lineups: readonly Lineup[],
  builtInLineups: readonly Lineup[],
): readonly Lineup[] {
  return lineups.filter((lineup) => !isBuiltInCopy(lineup, builtInLineups));
}

/** The built-in lineups of every map the given lineups name, from the same source as the screen. */
export async function loadBuiltInsFor(lineups: readonly Lineup[]): Promise<readonly Lineup[]> {
  const maps = [...new Set(lineups.map((lineup) => lineup.map))];
  return (await Promise.all(maps.map(loadBuiltIns))).flat();
}
