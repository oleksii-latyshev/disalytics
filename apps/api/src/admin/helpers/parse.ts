import {
  type BadRequest,
  badRequest,
  MAX_TITLE_LENGTH,
  type Resolution,
} from '@disa/admin-contract';
import { isLineup, type Lineup, normalizeLineup, parseLineupFile } from '@disa/demo-core';
import { Effect } from 'effect';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The lineups of a file's `lineups` array that belong to `map`, each validated and brought to the
 * current group shape, so they compare equal to what storage hands back.
 */
export function lineupsOfMap(
  file: unknown,
  map: string,
): Effect.Effect<{ readonly lineups: Lineup[]; readonly ignored: number }, BadRequest> {
  return Effect.suspend(() => {
    if (!isRecord(file) || !Array.isArray(file.lineups)) {
      return Effect.fail(badRequest('invalid_file', 'file.lineups must be an array'));
    }
    const lineups: Lineup[] = [];
    const seen = new Set<string>();
    let ignored = 0;
    for (const [index, entry] of file.lineups.entries()) {
      if (!isLineup(entry)) {
        return Effect.fail(badRequest('invalid_file', `Invalid lineup entry at index ${index}`));
      }
      if (entry.map !== map) {
        ignored += 1;
        continue;
      }
      if (seen.has(entry.id)) {
        return Effect.fail(badRequest('invalid_file', `Lineup id ${entry.id} appears twice`));
      }
      seen.add(entry.id);
      lineups.push(normalizeLineup(entry));
    }
    return Effect.succeed({ lineups, ignored });
  });
}

export interface ParsedFile {
  readonly lineups: Lineup[];
  readonly ignored: number;
  readonly images: Readonly<Record<string, string>>;
}

/** A commit's file must be whole: every `local:` photo it references has to be embedded. */
export function parseCommitFile(file: unknown, map: string): Effect.Effect<ParsedFile, BadRequest> {
  return Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => parseLineupFile(JSON.stringify(file)),
      catch: (error) =>
        badRequest('invalid_file', error instanceof Error ? error.message : 'Invalid file'),
    });
    const { lineups, ignored } = yield* lineupsOfMap({ lineups: parsed.lineups }, map);
    return { lineups, ignored, images: parsed.images };
  });
}

/** Checks what the schema cannot: a title must not be blank or overlong, ids must be distinct. */
export function checkResolutions(
  resolutions: readonly Resolution[],
): Effect.Effect<readonly Resolution[], BadRequest> {
  return Effect.suspend(() => {
    if (new Set(resolutions.map((resolution) => resolution.id)).size !== resolutions.length) {
      return Effect.fail(badRequest('invalid_resolutions', 'A lineup is resolved twice'));
    }
    const trimmed: Resolution[] = [];
    for (const resolution of resolutions) {
      if (resolution.title === undefined) {
        trimmed.push(resolution);
        continue;
      }
      const title = resolution.title.trim();
      if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
        return Effect.fail(
          badRequest(
            'invalid_resolutions',
            `Title of ${resolution.id} must be 1 to ${MAX_TITLE_LENGTH} characters`,
          ),
        );
      }
      trimmed.push({ ...resolution, title });
    }
    return Effect.succeed(trimmed);
  });
}
