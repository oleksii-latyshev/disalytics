import type {
  DecisionAction,
  FieldDiff,
  TacticDecision,
  TacticPreviewItem,
} from '@disa/admin-contract';
import { parseTacticFile, TacticFileError } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

export interface LoadedTacticFile {
  readonly name: string;
  /** The file as the page read it; the Worker reads the tactics out of it again. */
  readonly file: unknown;
  readonly count: number;
}

export type TacticFileResult =
  | { readonly ok: true; readonly loaded: LoadedTacticFile }
  | { readonly ok: false; readonly key: TranslationKey; readonly detail: string | undefined };

export function readTacticFile(name: string, text: string): TacticFileResult {
  try {
    const tactics = parseTacticFile(text);
    const file: unknown = JSON.parse(text);
    return { ok: true, loaded: { name, file, count: tactics.length } };
  } catch (error) {
    if (error instanceof TacticFileError && error.code !== 'INVALID_JSON') {
      return { ok: false, key: 'admin.tactics.fileInvalid', detail: error.message };
    }
    return { ok: false, key: 'admin.file.invalidJson', detail: undefined };
  }
}

/** What can be done with a row: only a tactic that is valid and not already the same is worth saving. */
export function choicesOf(item: TacticPreviewItem): readonly DecisionAction[] {
  if (item.problems.length > 0 || item.status === 'unchanged') return ['skip'];
  return item.status === 'new' ? ['add', 'skip'] : ['replace', 'skip'];
}

export function defaultChoice(item: TacticPreviewItem): DecisionAction {
  return choicesOf(item)[0] ?? 'skip';
}

export function choiceOf(
  item: TacticPreviewItem,
  chosen: Readonly<Record<string, DecisionAction>>,
): DecisionAction {
  return chosen[item.id] ?? defaultChoice(item);
}

export function savingCount(
  items: readonly TacticPreviewItem[],
  chosen: Readonly<Record<string, DecisionAction>>,
): number {
  return items.filter((item) => choiceOf(item, chosen) !== 'skip').length;
}

export function decisionsOf(
  items: readonly TacticPreviewItem[],
  chosen: Readonly<Record<string, DecisionAction>>,
): TacticDecision[] {
  return items.map((item) => ({ action: choiceOf(item, chosen), tactic: item.tactic }));
}

const MAX_SHOWN = 48;

function shown(value: unknown): string | null {
  if (value === undefined) return '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return value.length > MAX_SHOWN ? `${value.slice(0, MAX_SHOWN)}…` : value;
  }
  if (Array.isArray(value)) return value.map(String).join(', ');
  return null;
}

/** One changed field as the row shows it: its name, and `before → after` when the values are simple. */
export function describeDiff(diff: FieldDiff): { field: string; change: string | null } {
  const before = shown(diff.before);
  const after = shown(diff.after);
  return {
    field: diff.field,
    change: before === null || after === null ? null : `${before} → ${after}`,
  };
}
