import {
  type ParsedDemo,
  type PlayerSlot,
  type PlayerStats,
  playerKeyRounds,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Play } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import type { StatWriter } from '../helpers/stat-writer';

export type PlayerViewLink = (view: 'duels' | 'heatmap', player: PlayerSlot) => void;

interface Props {
  demo: ParsedDemo;
  player: PlayerStats;
  write: StatWriter;
  onWatchRound: (roundIndex: number) => void;
  onPlayerView: PlayerViewLink;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';
const LINK =
  'cursor-pointer rounded-chip px-1 py-0.5 text-13 text-ink-dim underline-offset-2 transition-colors duration-(--duration-micro) ease-out hover:text-ink hover:underline';

function Fact({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-card bg-surface-2 px-3 py-2">
      <span className="numeric text-20 text-ink">{value}</span>
      <span className="text-12 text-ink-dim leading-dense">{children}</span>
    </div>
  );
}

/**
 * What the opened player's row adds: the duels and trades behind the figures, and the rounds that
 * were worth watching — each a chip that opens the replay at that round.
 *
 * Derived for the opened row only, so ten rows nobody opened walk nothing.
 */
export function PlayerDetail({ demo, player, write, onWatchRound, onPlayerView }: Props) {
  const t = useT();
  const keyRounds = useMemo(() => playerKeyRounds(demo, player.slot), [demo, player.slot]);
  const multiRounds = player.multiKillRounds.reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="grid grid-cols-2 gap-2 min-[1280px]:grid-cols-4">
        <Fact
          value={`${write(player.openingWon, 'integer')} : ${write(player.openingLost, 'integer')}`}
        >
          <Text path="review.stats.players.detail.opening" />
        </Fact>
        <Fact value={write(player.tradeKills, 'integer')}>
          <Text path="review.stats.players.col.tradeKills" />
        </Fact>
        <Fact value={write(multiRounds, 'integer')}>
          <Text path="review.stats.players.detail.multi" />
        </Fact>
        <Fact value={write(player.utilityDamage, 'integer')}>
          <Text path="review.stats.players.col.utilityDamage" />
        </Fact>
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-surface-2 px-3 py-2">
        <span className="text-12 text-ink-dim">
          <Text path="review.stats.players.detail.keyRounds" />
        </span>

        <div className="flex flex-wrap gap-1.5">
          {keyRounds.length === 0 && (
            <span className="text-12 text-ink-faint">
              <Text path="review.stats.players.detail.noKeyRounds" />
            </span>
          )}
          {keyRounds.map((moment) => (
            <button
              key={`${moment.kind}-${moment.roundIndex}`}
              type="button"
              title={t('review.stats.line.watch', { round: moment.roundIndex + 1 })}
              onClick={() => onWatchRound(moment.roundIndex)}
              className={`numeric inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-chip border border-line px-2 text-12 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover ${FOCUS_RING}`}
            >
              <Play aria-hidden="true" className="size-2.5 fill-current" />
              {moment.kind === 'multi' ? (
                <Text
                  path="review.stats.players.detail.chipMulti"
                  values={{ round: moment.roundIndex + 1, count: moment.count }}
                />
              ) : (
                <Text
                  path="review.stats.players.detail.chipClutch"
                  values={{ round: moment.roundIndex + 1, count: moment.count }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={() => onPlayerView('duels', player.slot)}
            className={`${LINK} ${FOCUS_RING}`}
          >
            <Text path="review.stats.players.detail.duels" />
          </button>
          <button
            type="button"
            onClick={() => onPlayerView('heatmap', player.slot)}
            className={`${LINK} ${FOCUS_RING}`}
          >
            <Text path="review.views.heatmap" />
          </button>
        </div>
      </div>
    </div>
  );
}
