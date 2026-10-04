import type { OpeningSide } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';

export type SortOrder = 'newest' | 'oldest';

export interface LibraryFilter {
  /** `null` is every map. */
  map: string | null;
  query: string;
}

/** What a filter reads off a match: the three things the search box promises to find it by. */
export interface Findable {
  map: string;
  fileName: string;
  teams: readonly string[];
}

export interface MapCount {
  map: string;
  count: number;
}

/** Regulation is 24 rounds in MR12; overtime is played in blocks of six. */
const REGULATION_ROUNDS = 24;
const OVERTIME_BLOCK = 6;

/** The maps on the device with how many matches each holds, most played first. */
export function mapCounts(demos: readonly { map: string }[]): readonly MapCount[] {
  const counts = new Map<string, number>();
  for (const demo of demos) counts.set(demo.map, (counts.get(demo.map) ?? 0) + 1);

  return [...counts]
    .map(([map, count]) => ({ map, count }))
    .sort((left, right) => right.count - left.count || left.map.localeCompare(right.map));
}

/** Case-insensitive, every word must be found somewhere in the map, the file name or a team. */
export function matchesFilter(subject: Findable, filter: LibraryFilter): boolean {
  if (filter.map !== null && subject.map !== filter.map) return false;
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [subject.map, subject.fileName, ...subject.teams].join('\n').toLowerCase();

  return words.every((word) => haystack.includes(word));
}

/** By when the demo was saved. The catalog's recency is for eviction and is not read here. */
export function sortDemos(demos: readonly SavedDemo[], order: SortOrder): readonly SavedDemo[] {
  const direction = order === 'newest' ? -1 : 1;

  return [...demos].sort(
    (left, right) =>
      direction * (left.storedAt - right.storedAt) || left.key.localeCompare(right.key),
  );
}

export interface StripCell {
  /** The round's number from 1 — its identity, and where it is drawn follows from it. */
  number: number;
  winner: OpeningSide;
}

export interface StripRow {
  cells: readonly StripCell[];
  /** The overtime block this row is, from 1; `null` for regulation. */
  overtime: number | null;
  /** The index in `cells` the sides change over at, `null` where the row has no half. */
  halftimeAt: number | null;
}

/** The round strip as rows: regulation first, then one row per block of overtime. */
export function stripRows(winners: readonly OpeningSide[]): readonly StripRow[] {
  const cells = winners.map((winner, index) => ({ number: index + 1, winner }));
  const rows: StripRow[] = [
    { cells: cells.slice(0, REGULATION_ROUNDS), overtime: null, halftimeAt: REGULATION_ROUNDS / 2 },
  ];
  for (let start = REGULATION_ROUNDS; start < winners.length; start += OVERTIME_BLOCK) {
    rows.push({
      cells: cells.slice(start, start + OVERTIME_BLOCK),
      overtime: (start - REGULATION_ROUNDS) / OVERTIME_BLOCK + 1,
      halftimeAt: null,
    });
  }

  return rows;
}

/** Each demo's share of the budget as a percentage, the sum capped at the whole bar. */
export function budgetShares(sizes: readonly number[], limit: number): readonly number[] {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const scale = total > limit ? limit / total : 1;

  return sizes.map((size) => ((size * scale) / limit) * 100);
}

export function freeBytes(used: number, limit: number): number {
  return Math.max(0, limit - used);
}
