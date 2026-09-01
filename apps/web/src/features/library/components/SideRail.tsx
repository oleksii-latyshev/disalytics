import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
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
 * §10.1's rail. **17.5rem** — the same column a team card takes, so the product has one measure
 * rather than two — `--glass-panel` at `--blur-panel`, which §2.3 permits because the ground behind
 * it is a static image and a blur over static ground is paid for once.
 *
 * **Below `--breakpoint-split` it becomes a row** of the same entries above the content: 280px of
 * rail against a 1024px window leaves the library two columns of card, which is a worse trade than
 * moving the nav. The foot rides at the end of the entry line there rather than below it, so the
 * order the eye reads is the order `Tab` takes — reordering interactive content visually is what
 * `grid-area` and `order` would have cost here.
 */
export function SideRail({ view, onView, onSettingsOpen, onHelpOpen }: Props) {
  const t = useT();

  return (
    <aside className="surface-card relative z-10 flex flex-col gap-3 p-3 split:h-dvh split:gap-6 split:p-4">
      <header className="flex flex-col gap-1">
        {/* The product name is a name, not copy — AGENTS.md §11 keeps this kind of vocabulary out
            of the message catalogue in both locales. */}
        <h1 className="font-ui text-20 leading-dense">disalytics</h1>
        <p className="hidden text-13 text-ink-dim leading-prose wide:block">
          <Text path="common.tagline" />
        </p>
      </header>

      <div className="flex items-start gap-2 split:flex-1 split:flex-col split:items-stretch split:gap-6">
        <nav aria-label={t('library.shell.nav')} className="min-w-0 flex-1">
          <ul className="flex list-none flex-wrap gap-1 p-0 split:flex-col split:flex-nowrap">
            {RAIL_SECTIONS.map((section) => (
              <RailEntry
                key={section.view}
                section={section}
                isCurrent={section.view === view}
                onSelect={() => onView(section.view)}
              />
            ))}
          </ul>
        </nav>

        {/* The same two sheets §10.5 and §10.6 describe, so the way in owns no copy of either. */}
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
