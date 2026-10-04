import type { Tactic } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import type { Reading } from './home-reading';

export type RecentItem =
  | { kind: 'match'; at: number; demo: SavedDemo }
  | { kind: 'tactic'; at: number; tactic: Tactic };

/** Matches and tactics on one list, newest first. */
export function mergeRecent(
  demos: readonly SavedDemo[],
  tactics: readonly Tactic[],
  limit: number,
): readonly RecentItem[] {
  const items: RecentItem[] = [
    ...demos.map((demo): RecentItem => ({ kind: 'match', at: demo.storedAt, demo })),
    ...tactics.map((tactic): RecentItem => ({ kind: 'tactic', at: tactic.updatedAt, tactic })),
  ];

  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

/**
 * The match Home continues: the one the reader was last in, if it is still on this device,
 * otherwise the newest one saved. `null` is a first run.
 */
export function lastMatchOf(
  demos: readonly SavedDemo[],
  reading: Reading | null,
): SavedDemo | null {
  const read = reading === null ? undefined : demos.find((demo) => demo.key === reading.key);
  if (read !== undefined) return read;

  return demos.reduce<SavedDemo | null>(
    (newest, demo) => (newest === null || demo.storedAt > newest.storedAt ? demo : newest),
    null,
  );
}
