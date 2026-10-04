import { hasBlindEvents, matchUtilityStats, type ParsedDemo } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { useMemo } from 'react';
import { UTILITY_TABLES } from '../helpers/utility-table';
import { UtilityStatsTable } from './UtilityStatsTable';

const NOTES = ['thrown', 'flashes', 'damage', 'unused'] as const;

/**
 * The Utility tab: how well each player and team used their grenades, one table per question with
 * both teams named by the side they opened on.
 *
 * Derived once per match — it walks every round, grenade, blind, hit and death — and nothing here
 * is on a readout, so nothing repeats it.
 */
export function StatsUtility({ demo }: { demo: ParsedDemo }) {
  const teams = useMemo(() => matchUtilityStats(demo), [demo]);
  const hasFlashData = useMemo(() => hasBlindEvents(demo), [demo]);

  return (
    <div className="flex flex-col gap-8">
      {UTILITY_TABLES.map((table) => (
        <UtilityStatsTable
          key={table.id}
          demo={demo}
          table={table}
          teams={teams}
          hasFlashData={hasFlashData}
        />
      ))}

      <section className="flex max-w-prose flex-col gap-2 px-1 text-13 text-ink-dim leading-prose">
        <h3 className="label-dense">
          <Text path="review.stats.players.notes.title" />
        </h3>
        {NOTES.map((note) => (
          <p key={note}>
            <Text path={`review.stats.utility.notes.${note}`} />
          </p>
        ))}
        <p>
          <Text path="review.stats.players.notes.flash" />
        </p>
      </section>

      {!hasFlashData && (
        <p className="text-13 text-ink-dim">
          <Text path="review.stats.utility.noFlashEvents" />
        </p>
      )}
    </div>
  );
}
