import { type Lineup, UTILITY_NAMES } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { X } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import { formatRoundClock, type ScheduledThrow } from '../helpers/tactic-schedule';
import type { ThrowOrigin } from '../helpers/tactic-throw-origins';
import { TacticThrowOrigin } from './TacticThrowOrigin';

export interface TacticThrowListProps {
  readonly throws: readonly ScheduledThrow[];
  readonly lineups: readonly Pick<Lineup, 'id' | 'title'>[];
  /** Where a hand throw of this slot can leave from, and which of those it leaves from. */
  readonly originsOf: (thrown: ScheduledThrow) => {
    readonly origins: readonly ThrowOrigin[];
    readonly chosen: number;
  };
  readonly onRemove: (throwId: string) => void;
  readonly onFrom: (throwId: string, origin: ThrowOrigin) => void;
}

/** The grenades of the step, each with who throws it, how, and when it lands on the round clock. */
export function TacticThrowList({
  throws,
  lineups,
  originsOf,
  onRemove,
  onFrom,
}: TacticThrowListProps) {
  const t = useT();

  return (
    <section
      aria-label={t('library.tactics.board.throws.title', { count: throws.length })}
      className="flex flex-col gap-2 p-3 [border-block-start:1px_solid_var(--color-line)]"
    >
      <h3 className="font-mono text-11 uppercase tracking-[0.12em] text-ink-dim">
        {t('library.tactics.board.throws.title', { count: throws.length })}
      </h3>
      {throws.length === 0 && (
        <p className="text-12 text-ink-dim leading-prose">
          {t('library.tactics.board.throws.empty')}
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {throws.map((thrown) => {
          const lineup = lineups.find((entry) => entry.id === thrown.lineupId);
          const how =
            thrown.lineupId === undefined
              ? t('library.tactics.board.throws.byHand')
              : (lineup?.title ?? t('library.tactics.board.throws.fromLineup'));
          return (
            <li
              key={thrown.id}
              className="flex flex-col gap-2 rounded-card border border-line bg-surface-0 p-2"
            >
              <span className="flex items-center gap-2.5">
                <UtilityGlyph
                  kind={thrown.kind}
                  label={UTILITY_NAMES[thrown.kind]}
                  size="control"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-13 font-semibold">
                    {UTILITY_NAMES[thrown.kind]}
                  </span>
                  <span className="truncate text-11 text-ink-dim">
                    {t('library.tactics.board.throws.meta', {
                      slot: thrown.slot + 1,
                      how,
                      clock: formatRoundClock(thrown.landAt),
                    })}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('library.tactics.board.throws.remove')}
                  title={t('library.tactics.board.throws.remove')}
                  onClick={() => onRemove(thrown.id)}
                  className="text-ink-dim hover:text-ink"
                >
                  <X />
                </Button>
              </span>
              {thrown.lineupId === undefined && (
                <TacticThrowOrigin
                  {...originsOf(thrown)}
                  onFrom={(origin) => onFrom(thrown.id, origin)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
