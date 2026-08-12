import { type ParsedDemo, roundElapsedSeconds, sideScoreAtFrame } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { useMemo } from 'react';
import type { CacheState } from '@/core/parsing';
import { createClockFormat, formatClock } from '@/core/playback';
import { cacheNoticeKey } from '../helpers/cache-copy';

interface Props {
  demo: ParsedDemo;
  frame: number;
  roundIndex: number | undefined;
  locale: string;
  cache: CacheState;
}

/**
 * The round, the map, the score and the clock — DESIGN.md §5.2, and the one place a `--ct`/`--t`
 * pair appears outside the plate and the team cards, because a score *is* side data.
 *
 * The round number is the screen's single `44` (§3), and it is **not** a button: §7.3 makes it the
 * way into the full-height ribbon overlay, and that overlay is the next step's. A control that
 * looks pressable and does nothing is worse than a number.
 */
export function RoundCard({ demo, frame, roundIndex, locale, cache }: Props) {
  const { rounds } = demo.events;
  const round = roundIndex === undefined ? undefined : rounds.at(roundIndex);
  const score = sideScoreAtFrame(demo, frame);
  const elapsed = roundElapsedSeconds(demo, frame);

  const format = useMemo(() => createClockFormat(locale), [locale]);
  const notice = cacheNoticeKey(cache);

  return (
    <section className="glass-panel flex flex-col gap-1 rounded-float p-4">
      {round === undefined ? (
        <p className="text-16">
          <Text path="review.warmup" />
        </p>
      ) : (
        <p className="flex items-baseline gap-2">
          <span aria-hidden="true" className="numeric text-44 leading-none">
            {round.number}
          </span>
          <span className="sr-only">
            <Text
              path="review.roundOfTotal"
              values={{ current: round.number, total: rounds.length }}
            />
          </span>
        </p>
      )}

      {/* A map name is game vocabulary — never translated, AGENTS.md §11. */}
      <p className="font-narrow text-13 text-ink-dim">{demo.header.map}</p>

      <p className="flex items-baseline gap-1.5">
        <span className="sr-only">
          <Text path="review.score" />{' '}
        </span>
        <span className="font-narrow text-ct">CT</span>
        <span className="numeric text-16">{score.CT}</span>
        <span className="text-ink-faint">:</span>
        <span className="numeric text-16">{score.T}</span>
        <span className="font-narrow text-t">T</span>
      </p>

      {elapsed !== undefined && (
        <p className="numeric text-14 text-ink-dim">
          <span className="sr-only">
            <Text path="review.roundClock" />{' '}
          </span>
          {formatClock(format, elapsed)}
        </p>
      )}

      {notice !== undefined && (
        <p className="text-11 text-ink-dim leading-prose">
          <Text path={notice} />
        </p>
      )}
    </section>
  );
}
