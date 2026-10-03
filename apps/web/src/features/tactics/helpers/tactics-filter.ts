import type { Tactic, TacticRound, TacticSide } from '@disa/demo-core';

export interface TacticFilterOptions {
  readonly map?: string | 'all' | undefined;
  readonly side?: TacticSide | 'ALL' | undefined;
  readonly round?: TacticRound | 'ALL' | undefined;
  readonly search?: string | undefined;
}

/** A tactic that names no rounds can be called on any of them. */
export function isCalledOn(tactic: Tactic, round: TacticRound): boolean {
  const rounds = tactic.rounds ?? [];
  return rounds.length === 0 || rounds.includes(round);
}

function matchesQuery(tactic: Tactic, query: string): boolean {
  return (
    tactic.title.toLowerCase().includes(query) ||
    (tactic.description?.toLowerCase().includes(query) ?? false) ||
    (tactic.author?.toLowerCase().includes(query) ?? false) ||
    tactic.steps.some(
      (step) =>
        step.name.toLowerCase().includes(query) ||
        (step.notes?.toLowerCase().includes(query) ?? false),
    )
  );
}

/**
 * Filters and sorts tactics according to map, side, round type, and query string.
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
  const selectedRound =
    options.round !== undefined && options.round !== 'ALL' ? options.round : undefined;

  return tactics
    .filter((tactic) => {
      if (selectedMap !== undefined && tactic.map !== selectedMap) {
        return false;
      }
      if (selectedSide !== undefined && tactic.side !== selectedSide) {
        return false;
      }
      if (selectedRound !== undefined && !isCalledOn(tactic, selectedRound)) {
        return false;
      }
      if (query.length > 0 && !matchesQuery(tactic, query)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
