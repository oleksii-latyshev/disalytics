import type { Tactic } from '@disa/demo-core';

export const MAX_HISTORY = 60;

export interface TacticHistory {
  readonly present: Tactic;
  readonly past: readonly Tactic[];
  readonly future: readonly Tactic[];
  /** The gesture the last edit belonged to; a repeat of it folds into the same undo step. */
  readonly gesture: string | null;
}

export function startHistory(tactic: Tactic): TacticHistory {
  return { present: tactic, past: [], future: [], gesture: null };
}

/**
 * Applies an edit. Edits sharing a `gesture` key (a drag, a run of keystrokes) become one undo
 * step; no key makes each edit its own. An edit that changes nothing leaves the history alone.
 */
export function applyEdit(
  history: TacticHistory,
  next: Tactic,
  gesture: string | null,
): TacticHistory {
  if (next === history.present) return history;
  const stamped = { ...next, updatedAt: Date.now() };
  if (gesture !== null && gesture === history.gesture) {
    return { ...history, present: stamped };
  }
  return {
    present: stamped,
    past: [...history.past, history.present].slice(-MAX_HISTORY),
    future: [],
    gesture,
  };
}

export function endGesture(history: TacticHistory): TacticHistory {
  return history.gesture === null ? history : { ...history, gesture: null };
}

export function undo(history: TacticHistory): TacticHistory {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    present: previous,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future],
    gesture: null,
  };
}

export function redo(history: TacticHistory): TacticHistory {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    present: next,
    past: [...history.past, history.present],
    future: history.future.slice(1),
    gesture: null,
  };
}
