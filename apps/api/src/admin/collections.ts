import type {
  ActorShape,
  BadRequest,
  CollectionsCommitRequest,
  CollectionsCommitResponse,
  CollectionsPreviewResponse,
  PreviewRequest,
} from '@disa/admin-contract';
import type { LineupCollection } from '@disa/demo-core';
import { Effect } from 'effect';
import { LineupStorage } from '../modules/lineups';
import type { StorageError } from '../shared/storage-error';
import { AdminConfig } from './config';
import {
  checkCollectionDecisions,
  collectionsOfMap,
  type MemberLookup,
  memberIdsOf,
  memberIdsOfDecisions,
  planCollections,
} from './helpers/collections';

interface Site {
  readonly lookup: MemberLookup;
  readonly stored: readonly LineupCollection[];
  readonly revision: number;
}

/** The map as the site has it right now: what member ids can be answered by, and its collections. */
function siteOf(
  map: string,
  ids: readonly string[],
): Effect.Effect<Site, StorageError, LineupStorage> {
  return Effect.gen(function* () {
    const storage = yield* LineupStorage;
    const existing = yield* storage.readMap(map);
    const aliases = yield* storage.aliasTargets(ids);
    return {
      lookup: { live: new Set(existing.lineups.map(({ id }) => id)), aliases },
      stored: existing.collections,
      revision: existing.revision,
    };
  });
}

/**
 * Reads the collections of a file against the site. Their lineups are those on the site now, so
 * this belongs after the file's lineups are saved: a lineup that was skipped is a dropped member.
 */
export function runCollectionsPreview(
  request: PreviewRequest,
): Effect.Effect<CollectionsPreviewResponse, BadRequest | StorageError, LineupStorage> {
  return Effect.gen(function* () {
    const { map } = request;
    const { collections, ignored } = yield* collectionsOfMap(request.file, map);
    const site = yield* siteOf(map, memberIdsOf(collections));
    return {
      map,
      revision: site.revision,
      items: planCollections(site.stored, collections, map, site.lookup),
      ignored,
    };
  });
}

/** Writes the collections the page decided on, with their members resolved against the site. */
export function runCollectionsCommit(
  request: CollectionsCommitRequest,
  actor: ActorShape,
): Effect.Effect<
  CollectionsCommitResponse,
  BadRequest | StorageError,
  LineupStorage | AdminConfig
> {
  return Effect.gen(function* () {
    const storage = yield* LineupStorage;
    const config = yield* AdminConfig;
    const { map } = request;
    const site = yield* siteOf(map, memberIdsOfDecisions(request.decisions));
    const { writes, skipped, dropped } = yield* checkCollectionDecisions({
      map,
      decisions: request.decisions,
      stored: site.stored,
      lookup: site.lookup,
      now: config.now(),
      foreign: (ids) => storage.foreignCollectionIds(map, ids),
    });
    yield* storage.saveCollections({ collections: writes, actor: actor.name, now: config.now() });
    const { revision } = yield* storage.readMap(map);
    return { map, revision, saved: writes.length, skipped, dropped };
  });
}
