import { Text, useT } from '@disa/i18n';
import { Menu, MenuItem, MenuPanel, MenuTrigger } from '@disa/ui';
import { ChevronDown, Layers, Play } from 'lucide-react';
import {
  ANALYSIS_VIEWS,
  type AnalysisSection,
  type AnalysisView,
  type MatchView,
  splitSeats,
} from '../helpers/match-views';

interface Props {
  view: MatchView;
  onView: (view: MatchView) => void;
  /** Where "Match analysis" lands from the stage — the last analysis view used in this match. */
  analysisView: AnalysisView;
  /** Overridable so the overflow menu can be exercised; it ships with `ANALYSIS_VIEWS`. */
  analysis?: readonly AnalysisSection[];
}

const SEAT =
  'relative flex h-8 items-center gap-1.5 rounded-card px-2.5 text-13 whitespace-nowrap transition-colors duration-(--duration-micro) ease-out';

function seatTone(isCurrent: boolean) {
  return isCurrent ? 'bg-selected text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink';
}

/**
 * The match's own navigation: the replay, and the match analysis with its views named.
 *
 * On the stage the analysis is one calm seat that opens the last view used. On a view screen the
 * views are text seats beside Replay; past five they move under "More". The current seat carries
 * `aria-current`, as the dock's does.
 */
export function MatchViewSwitch({ view, onView, analysisView, analysis = ANALYSIS_VIEWS }: Props) {
  const t = useT();
  const isStage = view === 'stage';
  const { flat, more } = splitSeats(analysis);
  const isInMore = more.some((section) => section.view === view);

  return (
    <nav aria-label={t('review.views.nav')}>
      <ul className="flex list-none items-center gap-0.5 p-0">
        <li>
          <button
            type="button"
            aria-current={isStage ? 'page' : undefined}
            onClick={() => onView('stage')}
            className={`${SEAT} ${seatTone(isStage)}`}
          >
            <Play aria-hidden="true" className="size-4" />
            <Text path="review.views.stage" />
          </button>
        </li>

        {isStage ? (
          <li>
            <button
              type="button"
              onClick={() => onView(analysisView)}
              className={`${SEAT} border border-line-strong text-ink hover:bg-hover`}
            >
              <Layers aria-hidden="true" className="size-4" />
              <Text path="review.views.analysis" />
            </button>
          </li>
        ) : (
          <>
            <li aria-hidden="true" className="mx-1 h-4 w-px bg-line-strong" />

            {flat.map(({ view: seat, labelPath }) => (
              <li key={seat}>
                <button
                  type="button"
                  aria-current={seat === view ? 'page' : undefined}
                  onClick={() => onView(seat)}
                  className={`${SEAT} ${seatTone(seat === view)}`}
                >
                  <Text path={labelPath} />
                </button>
              </li>
            ))}

            {more.length > 0 && (
              <li>
                <Menu>
                  <MenuTrigger
                    className={`${SEAT} ${seatTone(isInMore)}`}
                    aria-current={isInMore ? 'page' : undefined}
                  >
                    <Text path="review.views.more" />
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  </MenuTrigger>

                  <MenuPanel align="end">
                    {more.map(({ view: seat, labelPath }) => (
                      <MenuItem
                        key={seat}
                        aria-current={seat === view ? 'page' : undefined}
                        onClick={() => onView(seat)}
                      >
                        <Text path={labelPath} />
                      </MenuItem>
                    ))}
                  </MenuPanel>
                </Menu>
              </li>
            )}
          </>
        )}
      </ul>
    </nav>
  );
}
