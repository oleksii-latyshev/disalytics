import type { LineupCollection } from '@disa/demo-core';

export type Membership = 'all' | 'some' | 'none';

/** Whether a collection holds all, some or none of these lineups. */
export function membershipOf(collection: LineupCollection, ids: readonly string[]): Membership {
  if (ids.length === 0) return 'none';
  const held = ids.filter((id) => collection.lineupIds.includes(id)).length;
  if (held === 0) return 'none';
  return held === ids.length ? 'all' : 'some';
}

/** The lineups of a collection that exist on the map, in the order the collection holds them. */
export function memberLineupIds(
  collection: LineupCollection,
  knownIds: ReadonlySet<string>,
): readonly string[] {
  return collection.lineupIds.filter((id) => knownIds.has(id));
}
