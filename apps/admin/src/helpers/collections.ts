import type {
  CollectionDecision,
  CollectionPreviewItem,
  DecisionAction,
} from '@disa/admin-contract';
import { isLineupCollection, type Lineup, type LineupCollection } from '@disa/demo-core';

/** A collection of the file against the site, with its collections typed. */
export interface CollectionRow {
  readonly item: CollectionPreviewItem;
  /** The file's collection with each lineup resolved to one on the site. */
  readonly resolved: LineupCollection;
  readonly stored: LineupCollection | null;
}

export function rowsOf(items: readonly CollectionPreviewItem[]): CollectionRow[] {
  return items.flatMap((item): CollectionRow[] => {
    if (!isLineupCollection(item.collection)) return [];
    const stored = isLineupCollection(item.stored) ? item.stored : null;
    return [{ item, resolved: item.collection, stored }];
  });
}

/** What may be done with the row: nothing but skipping one with a problem or nothing to change. */
export function choicesOf(row: CollectionRow): readonly DecisionAction[] {
  if (row.item.problems.length > 0 || row.item.status === 'unchanged') return ['skip'];
  return [row.item.status === 'new' ? 'add' : 'replace', 'skip'];
}

/** A collection that can be saved is saved unless the person says otherwise. */
export function defaultChoice(row: CollectionRow): DecisionAction {
  return choicesOf(row)[0] ?? 'skip';
}

/** The decisions to commit, each with the collection as the file has it. */
export function decisionsOf(
  rows: readonly CollectionRow[],
  chosen: Readonly<Record<string, DecisionAction>>,
  fileCollections: readonly LineupCollection[],
): CollectionDecision[] {
  const byId = new Map(fileCollections.map((collection) => [collection.id, collection]));
  return rows.flatMap((row): CollectionDecision[] => {
    const action = chosen[row.item.id] ?? defaultChoice(row);
    const collection = byId.get(row.item.id);
    return action === 'skip' || collection === undefined ? [] : [{ action, collection }];
  });
}

/** Lineup titles for a line of text; an id with no lineup on the site stays as it is. */
export function titlesOf(ids: readonly string[], lineups: readonly Lineup[]): string {
  const titles = new Map(lineups.map(({ id, title }) => [id, title]));
  return ids.map((id) => titles.get(id) ?? id).join(', ');
}

export function savingCount(
  rows: readonly CollectionRow[],
  chosen: Readonly<Record<string, DecisionAction>>,
): number {
  return rows.filter((row) => (chosen[row.item.id] ?? defaultChoice(row)) !== 'skip').length;
}
