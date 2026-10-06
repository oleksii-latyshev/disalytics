import {
  parseTacticFile,
  readTactic,
  serializeTacticFile,
  type Tactic,
  type TacticReadOptions,
} from '@disa/demo-core';
import { tacticSpawns } from './tactic-setup';

/** How tactics of an older shape are filled in as they are read: spawns come from the map's spots. */
export const TACTIC_READ_OPTIONS: TacticReadOptions = { spawnsFor: tacticSpawns };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A bare array, a `{ tactics }` object or one tactic, from files that predate the file header. */
function candidatesOf(raw: unknown): readonly unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw.tactics)) return raw.tactics;
  return [raw];
}

/**
 * The tactics a file holds, migrated to the current shape — one tactic or a library. Throws when
 * the text is no tactic file; a file with some unreadable entries yields the ones that read.
 */
export function readTacticsFile(text: string): readonly Tactic[] {
  try {
    return parseTacticFile(text, TACTIC_READ_OPTIONS);
  } catch {
    const raw: unknown = JSON.parse(text);
    const found = candidatesOf(raw).flatMap((entry) => {
      const tactic = readTactic(entry, TACTIC_READ_OPTIONS);
      return tactic === null ? [] : [tactic];
    });
    if (found.length === 0) throw new Error('No valid tactics found in file');
    return found;
  }
}

export interface ImportConflict {
  readonly yours: Tactic;
  readonly incoming: Tactic;
}

export interface ImportPlan {
  /** Tactics this browser does not have yet. */
  readonly fresh: readonly Tactic[];
  /** Tactics with an id this browser already has, and that differ from it. */
  readonly conflicts: readonly ImportConflict[];
  /** Tactics already here exactly as the file has them. */
  readonly unchanged: number;
}

export type ConflictChoice = 'yours' | 'incoming';

/** Sorts an import into what is new, what clashes by id, and what is already here. */
export function planImport(existing: readonly Tactic[], incoming: readonly Tactic[]): ImportPlan {
  const byId = new Map(existing.map((tactic) => [tactic.id, tactic]));
  const lastById = new Map(incoming.map((tactic) => [tactic.id, tactic]));
  const fresh: Tactic[] = [];
  const conflicts: ImportConflict[] = [];
  let unchanged = 0;

  for (const tactic of lastById.values()) {
    const yours = byId.get(tactic.id);
    if (yours === undefined) fresh.push(tactic);
    else if (JSON.stringify(yours) === JSON.stringify(tactic)) unchanged++;
    else conflicts.push({ yours, incoming: tactic });
  }
  return { fresh, conflicts, unchanged };
}

/** What to write: every new tactic, and the incoming side of each clash the reader chose it for. */
export function tacticsToWrite(
  plan: ImportPlan,
  choices: ReadonlyMap<string, ConflictChoice>,
): readonly Tactic[] {
  return [
    ...plan.fresh,
    ...plan.conflicts
      .filter((conflict) => choices.get(conflict.incoming.id) === 'incoming')
      .map((conflict) => conflict.incoming),
  ];
}

/** The imported version of the tactic open in the editor, if the import replaced it. */
export function replacementFor(written: readonly Tactic[], openId: string): Tactic | null {
  return written.find((tactic) => tactic.id === openId) ?? null;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tactic'
  );
}

export interface TacticDownload {
  readonly filename: string;
  readonly content: string;
}

export function tacticDownload(tactic: Tactic): TacticDownload {
  return {
    filename: `disalytics-tactic-${tactic.map}-${slug(tactic.title)}.json`,
    content: serializeTacticFile(tactic),
  };
}

export function libraryDownload(tactics: readonly Tactic[], now: Date): TacticDownload {
  return {
    filename: `disalytics-tactics-${now.toISOString().slice(0, 10)}.json`,
    content: serializeTacticFile(tactics),
  };
}
