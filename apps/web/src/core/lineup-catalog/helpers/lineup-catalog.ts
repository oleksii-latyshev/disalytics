import { isBuiltInCopy, type Lineup, type LineupCollection } from '@disa/demo-core';
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

/**
 * A map's collections as the user sees them: the built-in ones first, read-only, then their own. A
 * stored collection with a built-in's id is a copy of it from before it was built in, and hides.
 */
export function combineCollections(
  customCollections: readonly LineupCollection[],
  builtInCollections: readonly LineupCollection[],
): readonly LineupCollection[] {
  const builtInIds = new Set(builtInCollections.map(({ id }) => id));
  return [
    ...builtInCollections.map((collection) => ({ ...collection, isBuiltIn: true })),
    ...customCollections.filter(({ id }) => !builtInIds.has(id)),
  ];
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
