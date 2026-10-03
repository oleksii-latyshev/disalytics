import { countObservedWeapons, type EnemyRoundEstimate } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { TrackedRound } from '../helpers/economy-session';

type Props = {
  rounds: readonly TrackedRound[];
  estimates: readonly EnemyRoundEstimate[];
  formatRange: (floor: number, ceiling: number) => string;
  isConfirmingReset: boolean;
  onAskReset: () => void;
  onConfirmReset: () => void;
  onCancelReset: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
};

export function EconomyHistory({
  rounds,
  estimates,
  formatRange,
  isConfirmingReset,
  onAskReset,
  onConfirmReset,
  onCancelReset,
  onEdit,
  onRemove,
}: Props) {
  const t = useT();

  return (
    <section className="mt-5" aria-label={t('library.tools.economy.history')}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-13 font-medium">
          <Text path="library.tools.economy.history" />
        </h4>
        <div className="flex items-center gap-3">
          <span className="numeric text-11 text-ink-dim">
            <Text path="library.tools.economy.roundCount" values={{ count: rounds.length }} />
          </span>
          <button
            type="button"
            onClick={onAskReset}
            className="min-h-10 text-11 text-ink-dim underline underline-offset-4 hover:text-ink"
          >
            <Text path="library.tools.economy.newMatch" />
          </button>
        </div>
      </div>
      {isConfirmingReset && (
        <div className="mb-3 rounded-chip border border-line bg-surface-2 p-3">
          <p className="text-12 text-ink">
            <Text path="library.tools.economy.confirmNewMatch" />
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onConfirmReset}
              className="min-h-10 rounded-chip bg-ink px-3 text-12 text-surface-0"
            >
              <Text path="library.tools.economy.clearRounds" />
            </button>
            <button
              type="button"
              onClick={onCancelReset}
              className="min-h-10 px-2 text-12 text-ink-dim hover:text-ink"
            >
              <Text path="library.tools.economy.cancelReset" />
            </button>
          </div>
        </div>
      )}
      <ol className="list-none [border-block-start:1px_solid_var(--color-line)] p-0">
        {rounds.map((round, index) => (
          <li
            key={round.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3"
          >
            <span className="numeric w-6 text-12 text-ink-dim">{index + 1}</span>
            <span className="min-w-0 flex-1 text-12">
              <Text
                path={
                  round.weWon
                    ? 'library.tools.economy.historyWon'
                    : 'library.tools.economy.historyLost'
                }
              />{' '}
              <span className="text-ink-dim">· {countObservedWeapons(round.weapons)}/5</span>
            </span>
            <span className="numeric text-12 text-ink-dim">
              ≈
              {formatRange(
                estimates[index]?.estimatedNextCashFloorPerPlayer ?? 0,
                estimates[index]?.estimatedNextCashPerPlayer ?? 0,
              )}
            </span>
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="text-11 text-ink-dim hover:text-ink"
            >
              <Text path="library.tools.economy.edit" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-11 text-ink-dim hover:text-ink"
            >
              <Text path="library.tools.economy.remove" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
