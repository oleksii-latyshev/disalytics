import {
  hasBlindEvents,
  matchPlayerStats,
  type ParsedDemo,
  type PlayerSlot,
  TRADE_WINDOW_SECONDS,
} from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { nextPlayerSort, type PlayerSort } from '../helpers/player-table';
import { PlayerStatsTable } from './PlayerStatsTable';

/**
 * The Players tab: both teams at once, named by the side they opened on, and one sort across both.
 *
 * **At most one row stands open across both tables.** Two open round-by-round strips is two
 * readings of the same shape in one view, and the question the strip answers — "which rounds was
 * this player in" — is asked of one player at a time.
 */
export function StatsPlayers({ demo }: { demo: ParsedDemo }) {
  const [opened, setOpened] = useState<PlayerSlot | null>(null);
  const [sort, setSort] = useState<PlayerSort | null>(null);

  // Derived once per match: this walks every round, kill, hit and blind, and nothing here is on a
  // readout, so a press on a header or a row must not repeat it.
  const teams = useMemo(() => matchPlayerStats(demo), [demo]);
  const hasFlashData = useMemo(() => hasBlindEvents(demo), [demo]);

  return (
    <div className="flex flex-col gap-3">
      {teams.map((team) => (
        <PlayerStatsTable
          key={team.team}
          demo={demo}
          team={team}
          hasFlashData={hasFlashData}
          sort={sort}
          onSort={(column) => setSort((current) => nextPlayerSort(current, column))}
          opened={opened}
          onOpen={setOpened}
        />
      ))}

      <section className="flex flex-col gap-1 px-1 text-12 text-ink-dim leading-prose">
        <h3 className="label-dense">
          <Text path="review.stats.players.notes.title" />
        </h3>
        <p>
          <Text path="review.stats.players.sortHint" />
        </p>
        <p>
          <Text path="review.stats.players.notes.kast" />
        </p>
        <p>
          <Text
            path="review.stats.players.notes.trade"
            values={{ seconds: TRADE_WINDOW_SECONDS }}
          />
        </p>
        <p>
          <Text path="review.stats.players.notes.multi" />
        </p>
        <p>
          <Text path="review.stats.players.notes.flash" />
        </p>
        <p>
          <Text path="review.stats.players.notes.rating" />
        </p>
        {!hasFlashData && (
          <p>
            <Text path="review.stats.noFlashEvents" />
          </p>
        )}
      </section>
    </div>
  );
}
