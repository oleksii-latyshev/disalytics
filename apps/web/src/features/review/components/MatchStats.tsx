import type { ParsedDemo } from '@disa/demo-core';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@disa/ui';
import { isStatsTab, STATS_TABS, type StatsTab } from '@/core/navigation';
import { StatsPlayers } from './StatsPlayers';
import { StatsRounds } from './StatsRounds';

interface Props {
  demo: ParsedDemo;
  tab: StatsTab;
  onTab: (tab: StatsTab) => void;
}

const TAB_LABELS: Record<StatsTab, TranslationKey> = {
  players: 'review.stats.tabs.players',
  rounds: 'review.stats.tabs.rounds',
};

/**
 * The match's numbers, one view with a tab per question — who did what, and how the rounds went.
 *
 * **The tab is the URL's** (`?tab=`), not state here: a link, a reload and the back button all land
 * on the tab the reader was reading. Each panel derives its own figures, so a tab nobody opened
 * walks nothing.
 */
export function MatchStats({ demo, tab, onTab }: Props) {
  const t = useT();

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        if (isStatsTab(next)) onTab(next);
      }}
      className="mx-auto flex min-h-0 w-full max-w-[80rem] flex-col gap-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-ui font-medium text-28 leading-dense">
          <Text path="review.views.stats" />
        </h2>

        <TabsList aria-label={t('review.stats.nav')}>
          {STATS_TABS.map((value) => (
            <TabsTab key={value} value={value}>
              <Text path={TAB_LABELS[value]} />
            </TabsTab>
          ))}
        </TabsList>
      </header>

      <TabsPanel value={tab} transition={{ duration: 0.12 }} className="min-h-0 overflow-y-auto">
        {tab === 'players' ? <StatsPlayers demo={demo} /> : <StatsRounds demo={demo} />}
      </TabsPanel>
    </Tabs>
  );
}
