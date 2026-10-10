import {
  type ActorShape,
  type BadRequest,
  badRequest,
  type TacticSaveRequest,
  type TacticSaveResponse,
  type TacticsCommitRequest,
  type TacticsCommitResponse,
  type TacticsPreviewRequest,
  type TacticsPreviewResponse,
} from '@disa/admin-contract';
import { isTactic, type Tactic } from '@disa/demo-core';
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

/** Why an editor that started from `basedOn` (exactly the `updatedAt` the page read) may not write over `stored`, or `null` when it may. */
function staleReason(
  id: string,
  stored: Tactic | undefined,
  basedOn: number | null,
): string | null {
  if (stored === undefined) {
    return basedOn === null ? null : `Tactic ${id} is no longer on the site`;
  }
  return basedOn === null || stored.updatedAt !== basedOn
    ? `Tactic ${id} was saved by someone else since it was opened`
    : null;
}

/**
 * Saves the one tactic the board editor sends: created when the site has no such id, replaced when
 * it has. The same rules as a commit apply. A stored version newer than the one the editor started
 * from was saved by someone else meanwhile, so it is refused rather than overwritten.
 */
export function runTacticSave(
  id: string,
  request: TacticSaveRequest,
  actor: ActorShape,
): Effect.Effect<TacticSaveResponse, BadRequest | StorageError, TacticStorage | AdminConfig> {
  return Effect.gen(function* () {
    const storage = yield* TacticStorage;
    const config = yield* AdminConfig;
    const candidate = request.tactic;
    if (!isTactic(candidate) || candidate.id !== id) {
      return yield* Effect.fail(badRequest('invalid_tactic', `The body is not the tactic ${id}`));
    }
    const before = yield* storage.read;
    const stored = before.tactics.find((entry) => entry.id === id);
    const staleness = staleReason(id, stored, request.basedOn);
    if (staleness !== null) return yield* Effect.fail(badRequest('tactic_changed', staleness));
    const inherited =
      stored?.author !== undefined && (candidate.author ?? '').trim().length === 0
        ? { ...candidate, author: stored.author }
        : candidate;
    const { writes } = yield* checkTacticDecisions({
      decisions: [{ action: stored === undefined ? 'add' : 'replace', tactic: inherited }],
      liveIds: new Set(before.tactics.map((entry) => entry.id)),
      author: actor.name,
    });
    yield* storage.save({ tactics: writes, actor: actor.name, now: config.now() });
    const { revision } = yield* storage.read;
    return { revision, tactic: writes[0] ?? inherited };
  });
}
