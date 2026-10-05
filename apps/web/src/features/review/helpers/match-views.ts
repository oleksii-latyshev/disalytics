import type { TranslationKey } from '@disa/i18n';
import type { MatchView } from '@/core/navigation';

/**
 * What a match can be showing, in the order the switch lists them. The stage is the replay; the
 * rest are the match analysis — readings of the whole of it, one screen per row.
 */
export type { MatchView } from '@/core/navigation';

export interface MatchViewSection {
  view: MatchView;
  labelPath: TranslationKey;
}

export const MATCH_VIEWS: readonly MatchViewSection[] = [
  { view: 'stage', labelPath: 'review.views.stage' },
  { view: 'stats', labelPath: 'review.views.stats' },
  { view: 'duels', labelPath: 'review.views.duels' },
  { view: 'heatmap', labelPath: 'review.views.heatmap' },
  { view: 'utility', labelPath: 'review.views.utility' },
];

export type AnalysisView = Exclude<MatchView, 'stage'>;

export interface AnalysisSection {
  view: AnalysisView;
  labelPath: TranslationKey;
}

export const ANALYSIS_VIEWS: readonly AnalysisSection[] = MATCH_VIEWS.flatMap((section) =>
  section.view === 'stage' ? [] : [{ view: section.view, labelPath: section.labelPath }],
);

/** Seats the bar draws flat; a sixth analysis view goes under "More". */
export const FLAT_SEAT_LIMIT = 5;

/** The analysis views that stand in the bar, and the ones that wait in the menu. */
export function splitSeats<T>(
  sections: readonly T[],
  limit: number = FLAT_SEAT_LIMIT,
): { flat: readonly T[]; more: readonly T[] } {
  return { flat: sections.slice(0, limit), more: sections.slice(limit) };
}

/** The next view in the order above, wrapping — §9.1's `V`. */
export function nextMatchView(current: MatchView): MatchView {
  const at = MATCH_VIEWS.findIndex((section) => section.view === current);
  const section = MATCH_VIEWS[(at + 1) % MATCH_VIEWS.length];

  return section?.view ?? 'stage';
}
