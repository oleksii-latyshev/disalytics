import { Text, useT } from '@disa/i18n';
import { Highlight, HighlightItem } from '@disa/ui';
import { MATCH_VIEWS, type MatchView } from '../helpers/match-views';

interface Props {
  view: MatchView;
  onView: (view: MatchView) => void;
}

/**
 * The match's own navigation, on the way out's own line in the top-left corner.
 *
 * **It is on that line because a line of its own would come off the map.** The plate is
 * `min(100cqi, 100cqb)` of the cell the stage's grid leaves it, and three of the four widths this
 * repository quotes a plate figure at are height-bound — so a strip of tabs, or even a third line in
 * this corner, is a subtraction from the plate. It is the same reasoning that ends `ShellDock` where
 * the match begins.
 *
 * **It speaks the dock's vocabulary**: `aria-current`, the ink step, the name as `sr-only` text on
 * the control rather than as an `aria-label`, and one `layoutId` sliding a 16×3 bar between seats.
 */
export function MatchViewSwitch({ view, onView }: Props) {
  const t = useT();

  return (
    <nav aria-label={t('review.views.nav')}>
      {/* `click` is off for `ShellDock`'s reason: `view` is the one answer to where the reader is,
          and a seat that lit itself on press would give it a second. */}
      <Highlight
        controlledItems
        click={false}
        value={view}
        exitDelay={0}
        className="right-0 bottom-0 left-0 mx-auto h-[3px] w-4 rounded-full bg-ink"
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      >
        <ul className="flex list-none items-center gap-0.5 p-0">
          {MATCH_VIEWS.map(({ view: seat, labelPath, icon: Icon, isSoon }) => (
            <HighlightItem
              key={seat}
              as="li"
              value={seat}
              // A `listitem` may not carry `aria-selected`, which the effect writes onto whatever it
              // wraps. The reading is the button's own `aria-current` — #292.
              aria-selected={undefined}
            >
              <button
                type="button"
                aria-current={seat === view ? 'page' : undefined}
                onClick={() => onView(seat)}
                className={`relative flex size-8 items-center justify-center rounded-card transition-colors duration-(--duration-micro) ease-out ${
                  seat === view ? 'text-ink' : 'text-ink-dim hover:text-ink'
                }`}
              >
                <Icon aria-hidden="true" className="size-4" />

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
            </HighlightItem>
          ))}
        </ul>
      </Highlight>
    </nav>
  );
}
