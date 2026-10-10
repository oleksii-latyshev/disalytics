import type { Tactic } from '@disa/demo-core';

/** What the editor is open on: a tactic from the site, or a new one not yet saved. */
export interface EditingTactic {
  /** Changes whenever the editor must start over (a new tactic, a reload). */
  readonly key: number;
  readonly tactic: Tactic;
  /** The `updatedAt` the editor started from; `null` for a new tactic. */
  readonly basedOn: number | null;
}

export function editingFromSite(key: number, tactic: Tactic): EditingTactic {
  return { key, tactic, basedOn: tactic.updatedAt };
}

export function editingNew(key: number, tactic: Tactic): EditingTactic {
  return { key, tactic, basedOn: null };
}
