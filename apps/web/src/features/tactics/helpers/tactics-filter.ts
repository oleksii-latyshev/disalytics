import type { Tactic, TacticSide } from '@disa/demo-core';

export interface TacticFilterOptions {
  readonly map?: string | 'all' | undefined;
  readonly side?: TacticSide | 'ALL' | undefined;
  readonly search?: string | undefined;
}

/**
 * Filters and sorts tactics according to map, side, and query string.
 * Results are sorted with most recently updated first.
 */
export function filterTactics(
  tactics: readonly Tactic[],
  options: TacticFilterOptions,
): readonly Tactic[] {
  const query = options.search?.trim().toLowerCase() ?? '';
  const selectedMap = options.map !== undefined && options.map !== 'all' ? options.map : undefined;
  const selectedSide =
    options.side !== undefined && options.side !== 'ALL' ? options.side : undefined;

  return tactics
    .filter((tactic) => {
      if (selectedMap !== undefined && tactic.map !== selectedMap) {
        return false;
      }
      if (selectedSide !== undefined && tactic.side !== selectedSide) {
        return false;
      }
      if (query.length > 0) {
        const titleMatch = tactic.title.toLowerCase().includes(query);
        const descMatch = tactic.description?.toLowerCase().includes(query) ?? false;
        const authorMatch = tactic.author?.toLowerCase().includes(query) ?? false;
        const notesMatch = tactic.steps.some(
          (step) =>
            step.name.toLowerCase().includes(query) ||
            (step.notes?.toLowerCase().includes(query) ?? false),
        );
        if (!titleMatch && !descMatch && !authorMatch && !notesMatch) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
