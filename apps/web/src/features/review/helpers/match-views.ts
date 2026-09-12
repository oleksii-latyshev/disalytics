import type { TranslationKey } from '@disa/i18n';
// `Map` is aliased because the global of that name is one Biome will not let a module shadow.
import { ChartColumn, Flame, type LucideIcon, Map as MapIcon, Table } from 'lucide-react';

/**
 * What a match can be showing, in the order the switch lists them. The stage is the match as it
 * plays; the rest are readings of the whole of it — `ROADMAP.md` M5, one screen per row.
 */
export type MatchView = 'stage' | 'scoreboard' | 'maps' | 'metrics';

/** A view with no screen behind it yet, which is every view but the stage. */
export type UnbuiltMatchView = Exclude<MatchView, 'stage'>;

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
  /**
   * Listed and honest about being unfinished, the way the shell lists the screens it does not have.
   * The navigation is what ships here, so adding a screen later is not a redesign.
   */
  isSoon: boolean;
}

export const MATCH_VIEWS: readonly MatchViewSection[] = [
  { view: 'stage', labelPath: 'review.views.stage', icon: MapIcon, isSoon: false },
  { view: 'scoreboard', labelPath: 'review.views.scoreboard', icon: Table, isSoon: true },
  { view: 'maps', labelPath: 'review.views.maps', icon: Flame, isSoon: true },
  { view: 'metrics', labelPath: 'review.views.metrics', icon: ChartColumn, isSoon: true },
];

/** The next view in the order above, wrapping — §9.1's `V`. */
export function nextMatchView(current: MatchView): MatchView {
  const at = MATCH_VIEWS.findIndex((section) => section.view === current);
  const section = MATCH_VIEWS[(at + 1) % MATCH_VIEWS.length];

  return section?.view ?? 'stage';
}
