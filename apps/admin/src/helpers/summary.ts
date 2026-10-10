import type { Tone } from '../components/flow/status';
import type { Row } from '../hooks/use-review';
import type { Writing } from './parts';

export type Category = 'update' | 'duplicate' | 'invalid' | 'new' | 'same';

export const CATEGORIES: readonly Category[] = ['update', 'duplicate', 'invalid', 'new', 'same'];

export const CATEGORY_TONE: Readonly<Record<Category, Tone>> = {
  update: 'update',
  duplicate: 'duplicate',
  invalid: 'invalid',
  new: 'new',
  same: 'same',
};

/** Which summary tile a lineup of the file counts in: what is wrong with it comes first. */
export function categoryOf(row: Row): Category {
  if (row.item.initialProblems.length > 0) return 'invalid';
  switch (row.item.status) {
    case 'update':
      return 'update';
    case 'duplicate':
      return 'duplicate';
    case 'new':
      return 'new';
    case 'unchanged':
      return 'same';
  }
}

export function countCategories(rows: readonly Row[]): Record<Category, number> {
  const counts: Record<Category, number> = { update: 0, duplicate: 0, invalid: 0, new: 0, same: 0 };
  for (const row of rows) counts[categoryOf(row)] += 1;
  return counts;
}

export interface Totals {
  readonly add: number;
  readonly update: number;
  readonly remove: number;
  readonly same: number;
  readonly blocked: number;
}

/** What pressing Apply would do, counted from the outcomes as they stand. */
export function totalsOf(rows: readonly Row[], removals: number): Totals {
  let add = 0;
  let update = 0;
  let same = 0;
  let blocked = 0;
  for (const { outcome } of rows) {
    if (outcome === 'add' || outcome === 'addSecond') add += 1;
    else if (outcome === 'update' || outcome === 'merge') update += 1;
    else if (outcome === 'fix') blocked += 1;
    else same += 1;
  }
  return { add, update, remove: removals, same, blocked };
}

/** The lineups to save, as the Worker is asked to save them. */
export function writingsOf(rows: readonly Row[]): Writing[] {
  return rows.flatMap((row): Writing[] => {
    const { plan } = row;
    if (plan.kind === 'skip') return [];
    return plan.kind === 'add'
      ? [{ action: 'add', lineup: plan.lineup }]
      : [
          {
            action: 'replace',
            targetId: plan.targetId,
            ...(row.item.id === plan.targetId ? {} : { sourceId: row.item.id }),
            lineup: plan.lineup,
          },
        ];
  });
}

export type ReviewAction = 'fix' | 'apply' | 'collections' | 'nothing';

/**
 * What the check step's main button does: apply the changes, or, with none to write, go on to the
 * file's collections; blocked while a lineup still needs fixing.
 */
export function reviewActionOf(totals: Totals, hasCollections: boolean): ReviewAction {
  if (totals.blocked > 0) return 'fix';
  if (totals.add + totals.update + totals.remove > 0) return 'apply';
  return hasCollections ? 'collections' : 'nothing';
}
