import type { TranslationKey } from '@disa/i18n';
import { ChartColumn, LayoutGrid, type LucideIcon, Upload, Waypoints } from 'lucide-react';

/** What the shell can be showing, in the order the dock lists them. */
export type ShellView = 'upload' | 'library' | 'lineups' | 'stats';

export interface DockSection {
  view: ShellView;
  labelPath: TranslationKey;
  /**
   * The dock states an entry as a glyph and its name in words on hover or focus, so the glyph is
   * the entry's only permanent mark and is chosen for what the screen holds rather than for what it
   * is called: a wall of cards, a path from a spot to a spot, a column chart.
   */
  icon: LucideIcon;
  /**
   * Two of the four are honest about being unfinished. They are focusable and pressing one says
   * what the screen will do and nothing else — the navigation shape exists now so that adding
   * those screens later is not a redesign.
   */
  isSoon: boolean;
}

export const DOCK_SECTIONS: readonly DockSection[] = [
  { view: 'upload', labelPath: 'library.shell.upload', icon: Upload, isSoon: false },
  { view: 'library', labelPath: 'library.shell.library', icon: LayoutGrid, isSoon: false },
  { view: 'lineups', labelPath: 'library.shell.lineups', icon: Waypoints, isSoon: true },
  { view: 'stats', labelPath: 'library.shell.stats', icon: ChartColumn, isSoon: true },
];
