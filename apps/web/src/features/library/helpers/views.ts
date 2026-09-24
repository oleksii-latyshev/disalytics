import type { TranslationKey } from '@disa/i18n';
import {
  ChartColumn,
  LayoutGrid,
  type LucideIcon,
  NotebookPen,
  Upload,
  Waypoints,
  Wrench,
} from 'lucide-react';

/** What the shell can be showing, in the order the dock lists them. */
export type ShellView = 'upload' | 'library' | 'tools' | 'lineups' | 'tactics' | 'stats';

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
  /** A way-in-only identity colour. The review stage still reserves these hues for demo data. */
  tone: string;
}

export const DOCK_SECTIONS: readonly DockSection[] = [
  {
    view: 'upload',
    labelPath: 'library.shell.upload',
    icon: Upload,
    isSoon: false,
    tone: 'linear-gradient(160deg, #42adff, #1672df)',
  },
  {
    view: 'library',
    labelPath: 'library.shell.library',
    icon: LayoutGrid,
    isSoon: false,
    tone: 'linear-gradient(160deg, #8d7cf5, #5a48ca)',
  },
  {
    view: 'tools',
    labelPath: 'library.shell.tools',
    icon: Wrench,
    isSoon: false,
    tone: 'linear-gradient(160deg, #f2a443, #cc751a)',
  },
  {
    view: 'lineups',
    labelPath: 'library.shell.lineups',
    icon: Waypoints,
    isSoon: false,
    tone: 'linear-gradient(160deg, #5ac580, #218750)',
  },
  {
    view: 'tactics',
    labelPath: 'library.shell.tactics',
    icon: NotebookPen,
    isSoon: false,
    tone: 'linear-gradient(160deg, #ed7b99, #b43d63)',
  },
  {
    view: 'stats',
    labelPath: 'library.shell.stats',
    icon: ChartColumn,
    isSoon: true,
    tone: 'linear-gradient(160deg, #ae7feb, #7442b5)',
  },
];
