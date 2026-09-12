import { Text, type TranslationKey } from '@disa/i18n';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  labelPath: TranslationKey;
  /** Absent for settings and help, which are actions rather than places to be. */
  isCurrent?: boolean;
  isSoon?: boolean;
  onSelect: () => void;
}

/**
 * One thing in the dock: a 40px square — the taller of the two control heights — carrying its glyph
 * at `--ink` when it is the current view and `--ink-dim` when it is not, with its name in words
 * above the dock while the pointer is on it or the keyboard is in it.
 *
 * **Settings and help are the same component**, and that is the reason it takes its fields rather
 * than a `DockSection`: six things sitting in one 52px panel with two hover treatments between them
 * is a panel that looks assembled from parts. What they do not take is `aria-current`, because
 * neither is a place the reader can be.
 *
 * **The name is `sr-only` text on the control rather than an `aria-label`**, and an unfinished entry
 * carries the same word its chip used to: the accessible name is *"Utility lineups Soon"*, which is
 * what a screen reader heard from the rail and is the reading a glyph must not cost. The label that
 * rises above the dock restates it and is `aria-hidden` for that reason — a tooltip may shorten a
 * route, it may not be one — and it is raised by `:focus-visible` rather than by focus, or a pressed
 * entry would leave its own name standing over the content it just opened.
 *
 * **It draws no background, at rest or on hover.** The mark for the current entry is the bar
 * `ShellDock` slides under it and interaction here is the ink step: a fill would be a second mark
 * under the first, and a filled box growing past the panel's edge under magnification is a rectangle
 * coming apart where a glyph lifts off a shelf.
 *
 * `relative` and `origin-bottom` are both load-bearing. The first is the reason `RailEntry` carried
 * it — the highlight is an absolutely positioned sibling at `z-index: 0`, and a static button paints
 * *below* a positioned sibling however late it comes in the DOM. The second is what makes the lift
 * grow up out of the dock rather than out through its neighbours, and it is what holds the glyph's
 * horizontal centre still while it scales, which `useDockMagnify` measures once and reuses.
 */
export function DockEntry({ icon: Icon, labelPath, isCurrent, isSoon, onSelect }: Props) {
  return (
    <span className="group relative flex">
      <button
        type="button"
        data-dock-item
        aria-current={isCurrent ? 'page' : undefined}
        onClick={onSelect}
        className={`relative flex size-10 origin-bottom items-center justify-center rounded-card transition-[color,scale] duration-(--duration-micro) ease-out ${
          isCurrent ? 'text-ink' : 'text-ink-dim hover:text-ink'
        }`}
      >
        <Icon aria-hidden="true" className="size-5" />

        <span className="sr-only">
          <Text path={labelPath} />
          {isSoon && (
            <>
              {' '}
              <Text path="common.soon" />
            </>
          )}
        </span>
      </button>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-chip border border-line bg-surface-2 px-2 py-1 text-12 text-ink opacity-0 transition-opacity duration-(--duration-micro) ease-out group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        <Text path={labelPath} />

        {isSoon && (
          <span className="label-dense rounded-chip border border-line px-1 py-0.5 text-ink-dim">
            <Text path="common.soon" />
          </span>
        )}
      </span>
    </span>
  );
}
