import { type LineupCollection, newLineupCollection, uniqueCollectionName } from '@disa/demo-core';

/**
 * A collection of the reader's own with the same lineups as `source`: a new id, no built-in mark,
 * and a name no collection of the map has yet, numbered when `wantedName` is taken.
 */
export function copyOfCollection(
  source: LineupCollection,
  collections: readonly LineupCollection[],
  wantedName: string,
  id: string,
  now: number,
): LineupCollection {
  return newLineupCollection(
    id,
    uniqueCollectionName(collections, wantedName),
    source.map,
    source.lineupIds,
    now,
  );
}
