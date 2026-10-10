import type {
  ActorShape,
  BadRequest,
  TacticsCommitRequest,
  TacticsCommitResponse,
  TacticsPreviewRequest,
  TacticsPreviewResponse,
} from '@disa/admin-contract';
import { Effect } from 'effect';
import { TacticStorage } from '../modules/tactics';
import type { StorageError } from '../shared/storage-error';
import { AdminConfig } from './config';
import { checkTacticDecisions, planTactics, tacticsOfFile } from './helpers/tactics';

/** Reads the tactics of a file against the site's, by id. */
export function runTacticsPreview(
  request: TacticsPreviewRequest,
): Effect.Effect<TacticsPreviewResponse, BadRequest | StorageError, TacticStorage> {
  return Effect.gen(function* () {
    const storage = yield* TacticStorage;
    const incoming = yield* tacticsOfFile(request.file);
    const site = yield* storage.read;
    return { revision: site.revision, items: planTactics(site.tactics, incoming) };
  });
}

/** Writes the tactics the page decided on; one without an author is credited to the committer. */
export function runTacticsCommit(
  request: TacticsCommitRequest,
  actor: ActorShape,
): Effect.Effect<TacticsCommitResponse, BadRequest | StorageError, TacticStorage | AdminConfig> {
  return Effect.gen(function* () {
    const storage = yield* TacticStorage;
    const config = yield* AdminConfig;
    const before = yield* storage.read;
    const { writes, skipped } = yield* checkTacticDecisions({
      decisions: request.decisions,
      liveIds: new Set(before.tactics.map(({ id }) => id)),
      author: actor.name,
    });
    yield* storage.save({ tactics: writes, actor: actor.name, now: config.now() });
    const { revision } = yield* storage.read;
    return { revision, saved: writes.length, skipped };
  });
}
