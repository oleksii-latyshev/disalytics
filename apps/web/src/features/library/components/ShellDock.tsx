import { useT } from '@disa/i18n';
import { Highlight, HighlightItem } from '@disa/ui';
import { CircleQuestionMark, Settings } from 'lucide-react';
import { DOCK_SECTIONS, type ShellView } from '../helpers/views';
import { useDockMagnify } from '../hooks/use-dock-magnify';
import { DockEntry } from './DockEntry';

interface Props {
  view: ShellView;
  onView: (view: ShellView) => void;
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
}

/**
 * The shell's navigation, along the bottom of the way in.
 *
 * **It replaced a 17.5rem rail, and the reason is the same one #233 gave for the rail ending at the
 * match, turned ninety degrees.** A column beside the content is a subtraction from the content's
 * own width — 280px of every screen that is not the match, which cost the library a column of cards
 * at 1440 and stretched it to two at 1024. A dock subtracts from the other axis instead, and it
 * subtracts far less: 52px of panel and the gap under it, reserved as padding on the scroller so a
 * scrolled library's last row clears it rather than sliding under it.
 *
 * **It ends where the match begins, exactly as the rail did.** The review screen has neither, and
 * that is §5.1 rather than taste: the plate is `min(100cqi, 100cqb)` of the cell the stage leaves
 * it, and three of the four widths this repository quotes a plate figure at are height-bound — so a
 * band along the bottom of *that* screen would come straight out of the map.
 *
 * **Nothing about where you are is in the magnification.** The current entry is `aria-current`, the
 * ink step, and the bar this slides under it — animate-ui's `Highlight` in `children` mode, one
 * `layoutId` shared by every seat, so `motion` moves the same 16px mark between them on `transform`
 * alone. The lift `useDockMagnify` adds is a pointer affordance on top of all three and is absent
 * under reduced motion and under touch.
 *
 * The panel is a card rather than an edge — `--surface-1` with a hairline and `--radius-float`,
 * floating clear of the viewport's bottom — because unlike the rail it is not the edge of the
 * screen: it stands over the way in's own pixel field, and a full-width bar there would cut the
 * field in half.
 */
export function ShellDock({ view, onView, onSettingsOpen, onHelpOpen }: Props) {
  const t = useT();
  const panelRef = useDockMagnify();

  return (
    // The band takes no pointer events, so the field and the content under it stay reachable
    // everywhere the panel itself is not.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3">
      <div
        ref={panelRef}
        // No `overflow` of any kind: the panel is six 40px squares and a rule, so it cannot outgrow
        // a viewport — and a scroll container here would clip the labels, which rise out of the top
        // of it.
        className="pointer-events-auto flex items-end gap-1 rounded-float border border-line bg-surface-1 p-1.5"
      >
        <nav aria-label={t('library.shell.nav')}>
          {/* `click` is off because the bar is not the control: `view` is the one answer to where
              the reader is, and letting an item light itself on press would give it a second. */}
          <Highlight
            controlledItems
            click={false}
            value={view}
            exitDelay={0}
            className="right-0 bottom-0 left-0 mx-auto h-[3px] w-4 rounded-full bg-ink"
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <ul className="flex list-none items-end gap-1 p-0">
              {DOCK_SECTIONS.map((section) => (
                <HighlightItem
                  key={section.view}
                  as="li"
                  value={section.view}
                  // The effect writes `aria-selected` onto whatever it wraps, and a `listitem` is not
                  // one of the roles that may carry it. Passing it undefined drops the attribute —
                  // the reading is `aria-current` on the button inside, which is the correct one.
                  aria-selected={undefined}
                >
                  <DockEntry
                    icon={section.icon}
                    labelPath={section.labelPath}
                    isCurrent={section.view === view}
                    isSoon={section.isSoon}
                    onSelect={() => onView(section.view)}
                  />
                </HighlightItem>
              ))}
            </ul>
          </Highlight>
        </nav>

        <span aria-hidden="true" className="mx-1 h-6 w-px self-center bg-line" />

        {/* The same two sheets settings and help own, so the way in keeps no copy of either. */}
        <div className="flex items-end gap-1">
          <DockEntry icon={Settings} labelPath="common.settings" onSelect={onSettingsOpen} />

          <DockEntry icon={CircleQuestionMark} labelPath="common.help" onSelect={onHelpOpen} />
        </div>
      </div>
    </div>
  );
}
