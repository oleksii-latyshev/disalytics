import type { ParsedDemo } from '@disa/demo-core';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { STATS_TABS, type StatsTab } from '@/core/navigation';
import { StatsPlayers } from './StatsPlayers';
import { StatsRounds } from './StatsRounds';
import { StatsUtility } from './StatsUtility';

interface Props {
  demo: ParsedDemo;
  tab: StatsTab;
  onTab: (tab: StatsTab) => void;
}

const TAB_LABELS: Record<StatsTab, TranslationKey> = {
  players: 'review.stats.tabs.players',
  rounds: 'review.stats.tabs.rounds',
  utility: 'review.stats.tabs.utility',
};

/**
 * The match's numbers, one view with a tab per question — who did what, and how the rounds went.
 *
 * **It is one page.** The heading, the tabs and what they show scroll together, in the screen's
 * content row, and nothing inside has a scroll of its own: a tab swaps the component and does not
 * open a container. The gutter is stable so the switch never moves the content sideways.
 *
 * **The tab is the URL's** (`?tab=`), not state here: a link, a reload and the back button all land
 * on the tab the reader was reading. Only the open tab is mounted, so a tab nobody opened walks
 * nothing. The tabs speak the match switch's vocabulary — `aria-current` on plain buttons.
 */
export function MatchStats({ demo, tab, onTab }: Props) {
  const t = useT();

  return (
    <div className="min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-ui font-medium text-28 leading-dense">
            <Text path="review.views.stats" />
          </h2>

          <nav aria-label={t('review.stats.nav')}>
            <ul className="flex list-none items-center gap-1 p-0">
              {STATS_TABS.map((value) => (
                <li key={value}>
                  <button
                    type="button"
                    aria-current={value === tab ? 'page' : undefined}
                    onClick={() => onTab(value)}
                    className={`h-9 cursor-pointer rounded-card px-3 text-14 transition-colors duration-(--duration-micro) ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                      value === tab
                        ? 'bg-selected font-medium text-ink'
                        : 'text-ink-dim hover:bg-hover hover:text-ink'
                    }`}
                  >
                    <Text path={TAB_LABELS[value]} />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {tab === 'players' && <StatsPlayers demo={demo} />}
        {tab === 'rounds' && <StatsRounds demo={demo} />}
        {tab === 'utility' && <StatsUtility demo={demo} />}
      </div>
    </div>
  );
}
