import { Text, useT } from '@disa/i18n';
import { Button, Highlight, HighlightItem } from '@disa/ui';
import { CircleQuestionMark, Settings } from 'lucide-react';
import { RAIL_SECTIONS, type RailView } from '../helpers/views';
import { RailEntry } from './RailEntry';

interface Props {
  view: RailView;
  onView: (view: RailView) => void;
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
}

/**
 * The rail. **17.5rem** — the same column a team card takes, so the product has one measure rather
 * than two — against the app's own ground with a hairline down its inside edge. It is not a card:
 * a card floats on the ground it sits on, and the rail is the edge of the screen.
 *
 * **Below `--breakpoint-split` it becomes a row** of the same entries above the content, with the
 * hairline moving to its bottom edge: 280px of rail against a 1024px window leaves the library two
 * columns of card, which is a worse trade than moving the nav. The foot rides at the end of the
 * entry line there rather than below it, so the order the eye reads is the order `Tab` takes —
 * reordering interactive content visually is what `grid-area` and `order` would have cost here.
 *
 * **The current entry is a pill that slides**, not a fill that appears somewhere else. That is
 * animate-ui's `Highlight` in `children` mode: one `layoutId` shared by every seat, so `motion`
 * moves the same element between them on `transform` alone rather than fading one out and another
 * in. The pill is the only thing on this screen that says where you are, so it is worth the reader
 * being able to follow it with their eye.
 */
export function SideRail({ view, onView, onSettingsOpen, onHelpOpen }: Props) {
  const t = useT();

  return (
    <aside className="relative z-10 flex flex-col gap-3 border-b border-line bg-surface-0 p-3 split:h-dvh split:gap-6 split:border-r split:border-b-0 split:p-4">
      <header className="flex flex-col gap-1">
        {/* The product name is a name, not copy — AGENTS.md §11 keeps this kind of vocabulary out
            of the message catalogue in both locales. */}
        <h1 className="font-ui font-medium text-20 leading-dense">disalytics</h1>
        <p className="hidden text-13 text-ink-dim leading-prose wide:block">
          <Text path="common.tagline" />
        </p>
      </header>

      <div className="flex items-start gap-2 split:flex-1 split:flex-col split:items-stretch split:gap-6">
        <nav aria-label={t('library.shell.nav')} className="min-w-0 flex-1">
          {/* `click` is off because the pill is not the control: `view` is the one answer to where
              the reader is, and letting an item light itself on press would give it a second. */}
          <Highlight
            controlledItems
            click={false}
            value={view}
            exitDelay={0}
            className="inset-0 rounded-card bg-selected"
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <ul className="flex list-none flex-wrap gap-1 p-0 split:flex-col split:flex-nowrap">
              {RAIL_SECTIONS.map((section) => (
                <HighlightItem
                  key={section.view}
                  as="li"
                  value={section.view}
                  // The effect writes `aria-selected` onto whatever it wraps, and a `listitem` is not
                  // one of the roles that may carry it. Passing it undefined drops the attribute —
                  // the reading is `aria-current` on the button inside, which is the correct one.
                  aria-selected={undefined}
                >
                  <RailEntry
                    section={section}
                    isCurrent={section.view === view}
                    onSelect={() => onView(section.view)}
                  />
                </HighlightItem>
              ))}
            </ul>
          </Highlight>
        </nav>

        {/* The same two sheets settings and help own, so the way in keeps no copy of either. */}
        <div className="flex shrink-0 gap-1 text-ink-dim split:mt-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t('common.settings')}
            onClick={onSettingsOpen}
          >
            <Settings aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={t('common.help')}
            onClick={onHelpOpen}
          >
            <CircleQuestionMark aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
