import type {
  BadRequest,
  CommitRequest,
  CommitResponse,
  WithheldLineup,
} from '@disa/admin-contract';
import type { Lineup } from '@disa/demo-core';
import { Effect } from 'effect';
import { LineupStorage } from '../modules/lineups';
import type { PhotoStorage } from '../modules/photos';
import type { StorageError } from '../shared/storage-error';
import { AdminConfig } from './config';
import { checkDecisions } from './helpers/decisions';
import {
  failuresOf,
  photoRefsToStore,
  settlePhotos,
  withStoredPhotos,
} from './helpers/settle-photos';
import { PhotoLinks } from './photo-links';

/**
 * Applies what the page decided. The lineups arrive exactly as they should be saved; the Worker
 * re-checks each against the shared rules, puts every photo into our storage, and writes the rest
 * in one batch. A lineup whose photo could not be stored is withheld and reported, so the page can
 * retry it or save it without that photo.
 */
export function runCommit(
  request: CommitRequest,
  actor: string,
): Effect.Effect<
  CommitResponse,
  BadRequest | StorageError,
  LineupStorage | PhotoStorage | PhotoLinks | AdminConfig
> {
  return Effect.gen(function* () {
    const storage = yield* LineupStorage;
    const links = yield* PhotoLinks;
    const config = yield* AdminConfig;
    const { map } = request;

    const existing = yield* storage.readMap(map);
    const { writes, skipped } = yield* checkDecisions({
      map,
      decisions: request.decisions,
      stored: new Set(existing.lineups.map(({ id }) => id)),
      taken: storage.takenIds,
    });

    const photos = yield* settlePhotos(
      photoRefsToStore(
        writes.map(({ lineup }) => lineup),
        config.photoBaseUrl,
      ),
      request.images,
    );
    yield* links.remember(photos.copiedLinks, config.now());

    const withheld: WithheldLineup[] = [];
    const final: Lineup[] = [];
    for (const { lineup } of writes) {
      const failures = failuresOf(lineup, photos.failures);
      if (failures.length > 0) withheld.push({ id: lineup.id, failures });
      else final.push(withStoredPhotos(lineup, photos.urlByRef));
    }

    yield* storage.saveLineups({ lineups: final, actor, now: config.now() });
    const { revision } = yield* storage.readMap(map);
    return {
      map,
      revision,
      saved: final.length,
      skipped,
      photos: { uploaded: photos.uploaded, copied: photos.copied },
      withheld,
    };
  });
}
