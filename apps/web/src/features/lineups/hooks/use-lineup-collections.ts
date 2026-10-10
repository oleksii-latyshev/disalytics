import {
  isCollectionNameTaken,
  type LineupCollection,
  newLineupCollection,
  prunedCollection,
  renamedCollection,
  withCollectionMembers,
  withoutCollectionMembers,
} from '@disa/demo-core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { combineCollections } from '@/core/lineup-catalog';
import { copyOfCollection } from '../helpers/lineup-collection-copy';
import { membershipOf } from '../helpers/lineup-collection-membership';
import { newCollectionId } from '../helpers/lineup-ids';
import {
  loadCollections,
  persistCollections,
  removeCollection,
} from '../helpers/persist-collection';

const NONE: readonly LineupCollection[] = [];

/** The collection with this id when it is the user's own; a built-in one is read-only. */
function ownCollection(
  collections: readonly LineupCollection[],
  id: string,
): LineupCollection | undefined {
  const found = collections.find((collection) => collection.id === id);
  return found?.isBuiltIn === true ? undefined : found;
}

interface Options {
  map: string;
  /** Every id the map's lineups have, built-ins included; ids outside it are dropped on a write. */
  knownIds: ReadonlySet<string>;
  /** Until the lineups are in, `knownIds` is empty and must not be used to prune. */
  isLineupsLoading: boolean;
  /** The API's collections of the map: shown before the user's own and never edited here. */
  builtIns: readonly LineupCollection[];
}

/**
 * The map's collections, built-in ones first, and every change to the user's own. Each write reads
 * the map's collections again. A built-in collection is changed by copying it, never in place.
 */
export function useLineupCollections({ map, knownIds, isLineupsLoading, builtIns }: Options) {
  const [loaded, setLoaded] = useState<{ map: string; collections: readonly LineupCollection[] }>({
    map: '',
    collections: NONE,
  });

  const reload = useCallback(async () => {
    setLoaded({ map, collections: await loadCollections(map) });
  }, [map]);

  useEffect(() => {
    let isCurrent = true;
    void loadCollections(map).then((collections) => {
      if (isCurrent) setLoaded({ map, collections });
    });
    return () => {
      isCurrent = false;
    };
  }, [map]);

  const isLoading = loaded.map !== map;
  const collections = useMemo(
    () => combineCollections(isLoading ? NONE : loaded.collections, builtIns),
    [isLoading, loaded, builtIns],
  );

  const save = useCallback(
    async (changed: LineupCollection): Promise<boolean> => {
      const next = isLineupsLoading ? changed : prunedCollection(changed, knownIds);
      const isStored = await persistCollections([next]);
      if (isStored) await reload();
      return isStored;
    },
    [isLineupsLoading, knownIds, reload],
  );

  /** The new collection's id, or null when the name is blank or taken or nothing was stored. */
  const create = useCallback(
    async (name: string, lineupIds: readonly string[]): Promise<string | null> => {
      if (isCollectionNameTaken(collections, name) || name.trim() === '') return null;
      const made = newLineupCollection(newCollectionId(), name, map, lineupIds, Date.now());
      return (await save(made)) ? made.id : null;
    },
    [collections, map, save],
  );

  const rename = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const found = ownCollection(collections, id);
      if (found === undefined || name.trim() === '') return false;
      if (isCollectionNameTaken(collections, name, id)) return false;
      return save(renamedCollection(found, name, Date.now()));
    },
    [collections, save],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (ownCollection(collections, id) === undefined) return false;
      const isRemoved = await removeCollection(id);
      if (isRemoved) await reload();
      return isRemoved;
    },
    [collections, reload],
  );

  /** A user collection with the same lineups as a built-in one; the new collection's id, or null. */
  const copy = useCallback(
    async (id: string, wantedName: string): Promise<string | null> => {
      const source = collections.find((collection) => collection.id === id);
      if (source === undefined) return null;
      const made = copyOfCollection(source, collections, wantedName, newCollectionId(), Date.now());
      return (await save(made)) ? made.id : null;
    },
    [collections, save],
  );

  /** Puts these lineups in the collection, or takes them out when it already holds all of them. */
  const toggleMembers = useCallback(
    async (id: string, lineupIds: readonly string[]): Promise<boolean> => {
      const found = ownCollection(collections, id);
      if (found === undefined || lineupIds.length === 0) return false;
      const now = Date.now();
      return save(
        membershipOf(found, lineupIds) === 'all'
          ? withoutCollectionMembers(found, lineupIds, now)
          : withCollectionMembers(found, lineupIds, now),
      );
    },
    [collections, save],
  );

  return { collections, isLoading, reload, create, rename, remove, toggleMembers, copy };
}
