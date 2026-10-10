import {
  type BadRequest,
  badRequest,
  type FieldDiff,
  type TacticDecision,
  type TacticPreviewItem,
  tacticProblems,
} from '@disa/admin-contract';
import { isTactic, mainSteps, parseTacticFile, type Tactic } from '@disa/demo-core';
import { Effect } from 'effect';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON with sorted keys and no `undefined`, so two equal values print the same whatever their order. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value) ?? 'null';
  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

/** The tactics of a tactic file, in the current shape. Any entry that is not a tactic refuses the file. */
export function tacticsOfFile(file: unknown): Effect.Effect<readonly Tactic[], BadRequest> {
  return Effect.suspend(() => {
    let tactics: readonly Tactic[];
    try {
      tactics = parseTacticFile(JSON.stringify(file));
    } catch {
      return Effect.fail(badRequest('invalid_file', 'The file is not a tactic file'));
    }
    const seen = new Set<string>();
    for (const { id } of tactics) {
      if (seen.has(id))
        return Effect.fail(badRequest('invalid_file', `Tactic id ${id} appears twice`));
      seen.add(id);
    }
    return Effect.succeed(tactics);
  });
}

function planCount(tactic: Tactic): number {
  return tactic.plans.length;
}

/** The part of a tactic the site compares: its timestamps are the editor's bookkeeping, not content. */
function content(tactic: Tactic): Record<string, unknown> {
  const { createdAt: _created, updatedAt: _updated, ...rest } = tactic;
  return rest;
}

/** A file that names no author reads as the stored tactic's own: the commit credits the committer. */
function withStoredAuthor(tactic: Tactic, stored: Tactic): Tactic {
  const isBlank = tactic.author === undefined || tactic.author.trim().length === 0;
  return isBlank && stored.author !== undefined ? { ...tactic, author: stored.author } : tactic;
}

/** What differs between the site's tactic and the file's: the fields an editor reads, then the rest. */
export function diffTactics(before: Tactic, after: Tactic): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const field = (name: string, left: unknown, right: unknown) => {
    if (stable(left) === stable(right)) return;
    diffs.push({
      field: name,
      ...(left === undefined ? {} : { before: left }),
      ...(right === undefined ? {} : { after: right }),
    });
  };
  field('title', before.title, after.title);
  field('map', before.map, after.map);
  field('side', before.side, after.side);
  field('rounds', before.rounds, after.rounds);
  field('description', before.description, after.description);
  field('author', before.author, after.author);
  field('weapons', before.weapons, after.weapons);
  field('steps', mainSteps(before).length, mainSteps(after).length);
  field('plans', planCount(before), planCount(after));
  if (diffs.length === 0 && stable(content(before)) !== stable(content(after))) {
    diffs.push({ field: 'content' });
  }
  return diffs;
}

/** Classifies every tactic of the file against what the site holds, by id. */
export function planTactics(
  stored: readonly Tactic[],
  incoming: readonly Tactic[],
): TacticPreviewItem[] {
  const byId = new Map(stored.map((tactic) => [tactic.id, tactic]));
  return incoming.map((tactic): TacticPreviewItem => {
    const problems = tacticProblems(tactic);
    const base = { id: tactic.id, title: tactic.title, tactic, problems };
    const site = byId.get(tactic.id);
    if (site === undefined) return { ...base, status: 'new', diff: [] };
    const diff = diffTactics(site, withStoredAuthor(tactic, site));
    return diff.length === 0
      ? { ...base, status: 'unchanged', stored: site, diff }
      : { ...base, status: 'update', stored: site, diff };
  });
}

/** A tactic the file credits keeps that credit; one without gets the committing person. */
export function withAuthor(tactic: Tactic, author: string): Tactic {
  const isBlank = tactic.author === undefined || tactic.author.trim().length === 0;
  return isBlank ? { ...tactic, author } : tactic;
}

function invalid(detail: string): BadRequest {
  return badRequest('invalid_decisions', detail);
}

export interface CheckedTactics {
  readonly writes: readonly Tactic[];
  readonly skipped: number;
}

function validTactic(candidate: unknown): Effect.Effect<Tactic, BadRequest> {
  const problems = tacticProblems(candidate);
  if (problems.length === 0 && isTactic(candidate)) return Effect.succeed(candidate);
  const id = isRecord(candidate) ? String(candidate.id) : '?';
  return Effect.fail(
    badRequest(
      'invalid_tactic',
      `Tactic ${id} cannot be saved: ${problems.join(', ') || 'invalid'}`,
    ),
  );
}

function placement(
  action: 'add' | 'replace',
  tactic: Tactic,
  liveIds: ReadonlySet<string>,
): Effect.Effect<void, BadRequest> {
  if (action === 'replace' && !liveIds.has(tactic.id)) {
    return Effect.fail(invalid(`Replace names ${tactic.id}, which is not on the site`));
  }
  if (action === 'add' && liveIds.has(tactic.id)) {
    return Effect.fail(invalid(`${tactic.id} is already on the site`));
  }
  return Effect.void;
}

/**
 * Turns the page's decisions into the tactics to write, or refuses them. Nothing the page says
 * about status is trusted: a replace must name a tactic on the site, an add must bring an id the
 * site does not hold, and every tactic has to pass the rules the page showed.
 */
export function checkTacticDecisions(input: {
  readonly decisions: readonly TacticDecision[];
  readonly liveIds: ReadonlySet<string>;
  readonly author: string;
}): Effect.Effect<CheckedTactics, BadRequest> {
  const { decisions, liveIds, author } = input;
  return Effect.gen(function* () {
    const writes: Tactic[] = [];
    const seen = new Set<string>();
    for (const { action, tactic: candidate } of decisions) {
      if (action === 'skip') continue;
      const tactic = yield* validTactic(candidate);
      if (seen.has(tactic.id)) return yield* Effect.fail(invalid(`${tactic.id} is written twice`));
      seen.add(tactic.id);
      yield* placement(action, tactic, liveIds);
      writes.push(withAuthor(tactic, author));
    }
    return { writes, skipped: decisions.filter(({ action }) => action === 'skip').length };
  });
}
