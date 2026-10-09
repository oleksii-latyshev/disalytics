import { type BadRequest, badRequest } from '@disa/admin-contract';
import { type Lineup, looseLineup, normalizeLineup } from '@disa/demo-core';
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
      const lineup = looseLineup(entry);
      if (lineup === null) {
        return Effect.fail(badRequest('invalid_file', `Invalid lineup entry at index ${index}`));
      }
      if (lineup.map !== map) {
        ignored += 1;
        continue;
      }
      if (seen.has(lineup.id)) {
        return Effect.fail(badRequest('invalid_file', `Lineup id ${lineup.id} appears twice`));
      }
      seen.add(lineup.id);
      lineups.push(normalizeLineup(lineup));
    }
    return Effect.succeed({ lineups, ignored });
  });
}
