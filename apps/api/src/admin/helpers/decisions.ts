import {
  type BadRequest,
  badRequest,
  type CommitDecision,
  lineupProblems,
} from '@disa/admin-contract';
import { type Lineup, looseLineup, normalizeLineup } from '@disa/demo-core';
import { Effect } from 'effect';

/** A decision that will write a lineup, with the lineup as it will be saved (photo refs still the page's). */
export interface Write {
  readonly action: 'add' | 'replace';
  readonly lineup: Lineup;
  /** The id the lineup had in the file, to remember as an alias of the stored lineup it replaced. */
  readonly aliasFor?: string;
}

export interface CheckedDecisions {
  readonly writes: readonly Write[];
  readonly skipped: number;
}

function withoutBuiltInFlag(lineup: Lineup): Lineup {
  const { isBuiltIn: _flag, ...rest } = lineup;
  return rest;
}

function invalid(detail: string): BadRequest {
  return badRequest('invalid_decisions', detail);
}

function bodyOf(decision: CommitDecision): Effect.Effect<Lineup, BadRequest> {
  const lineup = looseLineup(decision.lineup);
  if (lineup === null) return Effect.fail(badRequest('invalid_lineup', 'A lineup is not valid'));
  return Effect.succeed(withoutBuiltInFlag(normalizeLineup(lineup)));
}

function problemsOf(lineup: Lineup, map: string): Effect.Effect<Lineup, BadRequest> {
  const problems = lineupProblems(lineup, map);
  if (problems.length === 0) return Effect.succeed(lineup);
  const codes = problems.map(({ code }) => code).join(', ');
  return Effect.fail(badRequest('invalid_lineup', `Lineup ${lineup.id} cannot be saved: ${codes}`));
}

function replaceWrite(
  decision: CommitDecision,
  lineup: Lineup,
  stored: ReadonlySet<string>,
  targets: Set<string>,
): Effect.Effect<Lineup, BadRequest> {
  const { targetId } = decision;
  if (targetId === undefined || !stored.has(targetId)) {
    return Effect.fail(invalid(`Replace names ${targetId ?? 'nothing'}, which is not stored`));
  }
  if (targets.has(targetId)) return Effect.fail(invalid(`${targetId} is replaced twice`));
  targets.add(targetId);
  return Effect.succeed({ ...lineup, id: targetId });
}

/** A file id worth remembering: it names nothing stored and is not the target itself. */
function aliasOf(sourceId: string | undefined, targetId: string, stored: ReadonlySet<string>) {
  const valid = sourceId !== undefined && sourceId.length > 0 && sourceId.length <= 200;
  return valid && sourceId !== targetId && !stored.has(sourceId) ? sourceId : null;
}

function firstAdd(id: string, seen: Set<string>): Effect.Effect<void, BadRequest> {
  if (seen.has(id)) return Effect.fail(invalid(`${id} is added twice`));
  seen.add(id);
  return Effect.void;
}

/**
 * Turns the page's decisions into the lineups to write, or refuses them. Nothing the page says
 * about status is trusted: a replace must name a stored lineup of this map, an add must bring an id
 * nothing uses, and every lineup has to pass the same rules the page showed.
 */
export function checkDecisions<E>(input: {
  readonly map: string;
  readonly decisions: readonly CommitDecision[];
  readonly stored: ReadonlySet<string>;
  readonly taken: (ids: readonly string[]) => Effect.Effect<ReadonlySet<string>, E>;
}): Effect.Effect<CheckedDecisions, BadRequest | E> {
  const { map, decisions, stored } = input;
  return Effect.gen(function* () {
    const writes: Write[] = [];
    const targets = new Set<string>();
    const addIds = new Set<string>();

    for (const decision of decisions) {
      if (decision.action === 'skip') continue;
      const body = yield* bodyOf(decision);
      if (decision.action === 'replace') {
        const lineup = yield* replaceWrite(decision, body, stored, targets);
        const checked = yield* problemsOf(lineup, map);
        const alias = aliasOf(decision.sourceId, checked.id, stored);
        writes.push({
          action: 'replace',
          lineup: checked,
          ...(alias === null ? {} : { aliasFor: alias }),
        });
        continue;
      }
      yield* firstAdd(body.id, addIds);
      writes.push({ action: 'add', lineup: yield* problemsOf(body, map) });
    }

    const taken = yield* input.taken([...addIds]);
    for (const id of addIds) {
      if (taken.has(id)) return yield* Effect.fail(invalid(`${id} is already stored`));
    }
    return { writes, skipped: decisions.filter(({ action }) => action === 'skip').length };
  });
}
