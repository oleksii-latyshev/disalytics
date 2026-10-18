import { Text, useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { BUY_NAME_KEYS } from '../helpers/round-copy';
import type { RoundEntry } from '../helpers/round-tactics';
import { CoordinationBadge } from './CoordinationBadge';

/** The round in view, under the step readout: how it ended, what was bought and how coordinated it read. */
export function TacticRoundDetail({ entry }: { entry: RoundEntry }) {
  const t = useT();
  const result = t(entry.didWin ? 'review.tactics.row.won' : 'review.tactics.row.lost');

  return (
    <section className="flex flex-col gap-1.5 p-3 pt-0 lg:pr-0">
      <div className="px-1 font-mono text-11 text-ink-dim uppercase tracking-[0.12em]">
        <Text path="review.tactics.detail.label" values={{ round: entry.number }} />
      </div>
      <div className="rounded-card border border-line bg-surface-1 p-2.5">
        <p className="m-0 flex items-baseline gap-2 text-14">
          <span className={cn('font-mono', entry.side === 'CT' ? 'text-ct' : 'text-t')}>
            {entry.side}
          </span>
          <span className="font-semibold">{result}</span>
          {entry.buy !== null && (
            <span className="text-12 text-ink-dim">{t(BUY_NAME_KEYS[entry.buy])}</span>
          )}
        </p>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-ink-dim">
          <span>
            {!entry.isPlanted ? (
              <Text path="review.tactics.row.noPlant" />
            ) : entry.site === null ? (
              <Text path="review.tactics.row.planted" />
            ) : (
              <Text path="review.tactics.row.site" values={{ site: entry.site }} />
            )}
          </span>
          <CoordinationBadge coordination={entry.coordination} />
        </p>
      </div>
    </section>
  );
}
