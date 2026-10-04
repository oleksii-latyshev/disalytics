import type { TranslationKey } from '@disa/i18n';
import {
  ChartColumn,
  Coins,
  FolderOpen,
  HardDrive,
  History,
  Keyboard,
  type LucideIcon,
  MessageSquareText,
  NotebookPen,
  Play,
  Swords,
  Waypoints,
} from 'lucide-react';

export type WidgetId =
  | 'hero'
  | 'stats'
  | 'tactics'
  | 'lineup'
  | 'open'
  | 'recent'
  | 'coach'
  | 'economy'
  | 'refs'
  | 'soon'
  | 'keys'
  | 'storage';

/** One column by one row, one by two, two by two, two by four — the grid's own vocabulary. */
export type WidgetSize = 'S' | 'M' | 'L' | 'XL';

export interface WidgetSpec {
  id: WidgetId;
  titlePath: TranslationKey;
  blurbPath: TranslationKey;
  icon: LucideIcon;
  /** The sizes the picker offers, smallest first. The first is also the size a bad record falls to. */
  sizes: readonly WidgetSize[];
  /** A widget that reads a saved match has nothing to say before there is one. */
  needsMatch: boolean;
  /** A strip is a single line: a glyph, a name, a sentence. */
  isStrip: boolean;
  /** Honest about being unfinished: drawn dashed and pressing it does nothing. */
  isSoon: boolean;
}

export const WIDGETS: readonly WidgetSpec[] = [
  {
    id: 'hero',
    titlePath: 'library.home.widget.hero.title',
    blurbPath: 'library.home.widget.hero.blurb',
    icon: Play,
    sizes: ['L', 'XL'],
    needsMatch: false,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'stats',
    titlePath: 'library.home.widget.stats.title',
    blurbPath: 'library.home.widget.stats.blurb',
    icon: ChartColumn,
    sizes: ['M', 'L'],
    needsMatch: true,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'tactics',
    titlePath: 'library.home.widget.tactics.title',
    blurbPath: 'library.home.widget.tactics.blurb',
    icon: NotebookPen,
    sizes: ['M', 'L'],
    needsMatch: false,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'lineup',
    titlePath: 'library.home.widget.lineup.title',
    blurbPath: 'library.home.widget.lineup.blurb',
    icon: Waypoints,
    sizes: ['M', 'L'],
    needsMatch: false,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'open',
    titlePath: 'library.home.widget.open.title',
    blurbPath: 'library.home.widget.open.blurb',
    icon: FolderOpen,
    sizes: ['S', 'M'],
    needsMatch: true,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'recent',
    titlePath: 'library.home.widget.recent.title',
    blurbPath: 'library.home.widget.recent.blurb',
    icon: History,
    sizes: ['M', 'L'],
    needsMatch: false,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'coach',
    titlePath: 'library.home.widget.coach.title',
    blurbPath: 'library.home.widget.coach.blurb',
    icon: MessageSquareText,
    sizes: ['M', 'L'],
    needsMatch: true,
    isStrip: false,
    isSoon: false,
  },
  {
    id: 'economy',
    titlePath: 'library.home.widget.economy.title',
    blurbPath: 'library.home.widget.economy.blurb',
    icon: Coins,
    sizes: ['S'],
    needsMatch: false,
    isStrip: true,
    isSoon: false,
  },
  {
    id: 'refs',
    titlePath: 'library.home.widget.refs.title',
    blurbPath: 'library.home.widget.refs.blurb',
    icon: Swords,
    sizes: ['S'],
    needsMatch: false,
    isStrip: true,
    isSoon: false,
  },
  {
    id: 'soon',
    titlePath: 'library.home.widget.soon.title',
    blurbPath: 'library.home.widget.soon.blurb',
    icon: ChartColumn,
    sizes: ['S'],
    needsMatch: false,
    isStrip: true,
    isSoon: false,
  },
  {
    id: 'keys',
    titlePath: 'library.home.widget.keys.title',
    blurbPath: 'library.home.widget.keys.blurb',
    icon: Keyboard,
    sizes: ['S'],
    needsMatch: false,
    isStrip: true,
    isSoon: false,
  },
  {
    id: 'storage',
    titlePath: 'library.home.widget.storage.title',
    blurbPath: 'library.home.widget.storage.blurb',
    icon: HardDrive,
    sizes: ['S'],
    needsMatch: false,
    isStrip: true,
    isSoon: false,
  },
];

const SPEC_BY_ID = new Map(WIDGETS.map((spec) => [spec.id, spec]));

export function widgetSpec(id: WidgetId): WidgetSpec {
  const spec = SPEC_BY_ID.get(id);
  if (spec === undefined) throw new Error(`unknown home widget ${id}`);

  return spec;
}

export function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === 'string' && SPEC_BY_ID.has(value as WidgetId);
}
