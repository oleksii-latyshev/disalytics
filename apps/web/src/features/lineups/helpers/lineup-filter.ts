import type { Lineup, LineupSide, UtilityKind } from '@disa/demo-core';

export type LineupSideFilter = 'ALL' | LineupSide;
export type LineupKindFilter = 'all' | UtilityKind;

export interface LineupFilterCriteria {
  readonly side: LineupSideFilter;
  readonly kind: LineupKindFilter;
  readonly search: string;
}

/** Pure filter function for lineups by side, kind, and search text. */
export function filterLineups(
  lineups: readonly Lineup[],
  criteria: LineupFilterCriteria,
): readonly Lineup[] {
  const { side, kind, search } = criteria;
  const q = search.trim().toLowerCase();

  return lineups.filter((lineup) => {
    if (side !== 'ALL' && lineup.side !== 'BOTH' && lineup.side !== side) {
      return false;
    }
    if (kind !== 'all' && lineup.kind !== kind) {
      return false;
    }
    if (q) {
      const inTitle = lineup.title.toLowerCase().includes(q);
      const inNotes = lineup.notes?.toLowerCase().includes(q) ?? false;
      if (!inTitle && !inNotes) return false;
    }
    return true;
  });
}
