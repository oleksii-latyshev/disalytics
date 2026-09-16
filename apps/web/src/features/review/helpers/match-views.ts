import type { TranslationKey } from '@disa/i18n';
// `Map` is aliased because the global of that name is one Biome will not let a module shadow.
import {
  ChartColumn,
  Cloud,
  Crosshair,
  Flame,
  type LucideIcon,
  Map as MapIcon,
  Table,
} from 'lucide-react';

/**
 * What a match can be showing, in the order the switch lists them. The stage is the match as it
 * plays; the rest are readings of the whole of it — `ROADMAP.md` M5, one screen per row.
 */
export type MatchView = 'stage' | 'scoreboard' | 'duels' | 'heatmap' | 'utility' | 'metrics';

export interface MatchViewSection {
  view: MatchView;
  labelPath: TranslationKey;
  /**
   * A glyph rather than the view's name, and the layout is what decides that: the switch shares a
   * line with the way out of the match inside a 17.5rem column, where four names — 15–30% longer in
   * Russian (§17 rule 7) — do not fit. The name is `sr-only` on the control, so a screen reader
   * still hears it.
   */
  icon: LucideIcon;
}

export const MATCH_VIEWS: readonly MatchViewSection[] = [
  { view: 'stage', labelPath: 'review.views.stage', icon: MapIcon },
  { view: 'scoreboard', labelPath: 'review.views.scoreboard', icon: Table },
  { view: 'duels', labelPath: 'review.views.duels', icon: Crosshair },
  { view: 'heatmap', labelPath: 'review.views.heatmap', icon: Flame },
  { view: 'utility', labelPath: 'review.views.utility', icon: Cloud },
  { view: 'metrics', labelPath: 'review.views.metrics', icon: ChartColumn },
];

/** The next view in the order above, wrapping — §9.1's `V`. */
export function nextMatchView(current: MatchView): MatchView {
  const at = MATCH_VIEWS.findIndex((section) => section.view === current);
  const section = MATCH_VIEWS[(at + 1) % MATCH_VIEWS.length];

  return section?.view ?? 'stage';
}
