import type { TranslationKey } from '@disa/i18n';

/** What the shell can be showing — `docs/DESIGN.md` §10.1, in the order the rail lists them. */
export type RailView = 'upload' | 'library' | 'lineups' | 'stats';

export interface RailSection {
  view: RailView;
  labelPath: TranslationKey;
  /**
   * Two of the four are honest about being unfinished. They are focusable and pressing one says
   * what the screen will do and nothing else — the navigation shape exists now so that adding
   * those screens later is not a redesign.
   */
  isSoon: boolean;
}

export const RAIL_SECTIONS: readonly RailSection[] = [
  { view: 'upload', labelPath: 'library.shell.upload', isSoon: false },
  { view: 'library', labelPath: 'library.shell.library', isSoon: false },
  { view: 'lineups', labelPath: 'library.shell.lineups', isSoon: true },
  { view: 'stats', labelPath: 'library.shell.stats', isSoon: true },
];
