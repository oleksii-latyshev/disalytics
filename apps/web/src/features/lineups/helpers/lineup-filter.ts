import type { Lineup, LineupSide, LineupTag, UtilityKind } from '@disa/demo-core';

export type LineupSideFilter = 'ALL' | LineupSide;
export type LineupKindFilter = 'all' | UtilityKind;

export type LineupTagFilter = 'all' | 'untagged' | LineupTag;

export interface LineupFilterCriteria {
  readonly side: LineupSideFilter;
  readonly kind: LineupKindFilter;
  readonly search: string;
  readonly tag?: LineupTagFilter;
}

function matchesTag(lineup: Lineup, tag: LineupTagFilter): boolean {
  if (tag === 'all') return true;
  if (tag === 'untagged') return (lineup.tags?.length ?? 0) === 0;
  return lineup.tags?.includes(tag) ?? false;
}

function matchesSearch(lineup: Lineup, q: string): boolean {
  if (!q) return true;
  return (
    lineup.title.toLowerCase().includes(q) ||
    (lineup.notes?.toLowerCase().includes(q) ?? false) ||
    (lineup.targetCallout?.toLowerCase().includes(q) ?? false)
  );
}

/** Pure filter function for lineups by side, kind, tag, and search text. */
export function filterLineups(
  lineups: readonly Lineup[],
  criteria: LineupFilterCriteria,
): readonly Lineup[] {
  const { side, kind, search, tag = 'all' } = criteria;
  const q = search.trim().toLowerCase();

  return lineups.filter((lineup) => {
    if (side !== 'ALL' && lineup.side !== 'BOTH' && lineup.side !== side) {
      return false;
    }
    if (kind !== 'all' && lineup.kind !== kind) {
      return false;
    }
    if (!matchesTag(lineup, tag)) {
      return false;
    }
    if (!matchesSearch(lineup, q)) {
      return false;
    }
    return true;
  });
}

/** How many of the lineups each kind has under the other criteria, so a chip says what it would show. */
export function countsByKind(
  lineups: readonly Lineup[],
  criteria: Omit<LineupFilterCriteria, 'kind'>,
): ReadonlyMap<UtilityKind, number> {
  const counts = new Map<UtilityKind, number>();

  for (const lineup of filterLineups(lineups, { ...criteria, kind: 'all' })) {
    counts.set(lineup.kind, (counts.get(lineup.kind) ?? 0) + 1);
  }

  return counts;
}
