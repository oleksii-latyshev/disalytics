import type { Team } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { REASON_PATHS } from '../constants/economy';
import { choiceClass } from '../helpers/economy-draft';
import type { TrackedRound } from '../helpers/economy-session';

type Props = {
  rounds: readonly TrackedRound[];
  openingSide: Team;
  onOpeningSide: (side: Team) => void;
  roundNumber: number;
  editingIndex: number | null;
  isConfirmingReset: boolean;
  onAskReset: () => void;
  onConfirmReset: () => void;
  onCancelReset: () => void;
  onEdit: (index: number) => void;
};

const SIDE_TEXT = { CT: 'text-ct', T: 'text-t' } as const;

export function EconomyHistory({
  rounds,
  openingSide,
  onOpeningSide,
  roundNumber,
  editingIndex,
  isConfirmingReset,
  onAskReset,
  onConfirmReset,
  onCancelReset,
  onEdit,
}: Props) {
  const t = useT();
  const isEntering = editingIndex === null;

  return (
    <aside
      aria-label={t('library.tools.economy.history')}
      className="flex min-w-0 flex-col gap-2 lg:rounded-card lg:border lg:border-line lg:bg-surface-1 lg:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="hidden text-11 tracking-[0.16em] text-ink-dim uppercase lg:inline">
          <Text path="library.tools.economy.history" />
        </span>
        <span className="flex items-center gap-1 text-12 text-ink-dim">
          <Text path="library.tools.economy.startSide" />
          {(['CT', 'T'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => onOpeningSide(side)}
              aria-pressed={openingSide === side}
              className={
                'numeric min-h-8 rounded-chip px-2 text-12 transition-colors ' +
                (openingSide === side
                  ? 'bg-selected text-ink'
                  : 'text-ink-dim hover:bg-hover hover:text-ink')
              }
            >
              <span className={openingSide === side ? SIDE_TEXT[side] : ''}>{side}</span>
            </button>
          ))}
        </span>
      </div>

      <ol className="-mx-4 flex list-none gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
        {rounds.map((round, index) => {
          const isEditing = editingIndex === index;
          return (
            <li key={round.id} className="flex-none lg:flex-auto">
              <button
                type="button"
                onClick={() => onEdit(index)}
                aria-current={isEditing ? 'true' : undefined}
                aria-label={t('library.tools.economy.editRound', { round: index + 1 })}
                className={
                  'flex min-h-9 w-full items-center gap-2.5 rounded-chip px-2.5 text-12 transition-colors lg:min-h-11 lg:[border-block-start:1px_solid_var(--color-line-soft)] ' +
                  (isEditing
                    ? 'bg-selected text-ink'
                    : round.weWon
                      ? 'bg-surface-3 text-ink hover:bg-press'
                      : 'border border-line bg-surface-1 text-ink-dim hover:bg-hover lg:border-0 lg:bg-transparent')
                }
              >
                <span className="numeric w-7 text-left text-ink-dim">
                  <Text path="library.tools.economy.roundShort" values={{ round: index + 1 }} />
                </span>
                <span
                  className={
                    'numeric grid size-6 place-items-center rounded-chip text-12 font-semibold ' +
                    (round.weWon ? 'bg-ink text-surface-0' : 'bg-surface-3 text-ink-dim')
                  }
                >
                  <Text
                    path={
                      round.weWon
                        ? 'library.tools.economy.winShort'
                        : 'library.tools.economy.lossShort'
                    }
                  />
                </span>
                <span className="hidden min-w-0 flex-1 truncate text-left text-13 text-ink-dim lg:inline">
                  <Text path={REASON_PATHS[round.reason]} />
                </span>
              </button>
            </li>
          );
        })}
        {isEntering && (
          <li
            aria-current="step"
            className="flex min-h-9 flex-none items-center gap-2.5 rounded-chip bg-ink px-2.5 text-12 font-semibold text-surface-0 lg:min-h-11 lg:flex-auto lg:bg-selected lg:font-normal lg:text-ink"
          >
            <span className="numeric lg:w-7">
              <Text path="library.tools.economy.roundShort" values={{ round: roundNumber }} />
            </span>
            <span className="lg:hidden">
              <Text path="library.tools.economy.now" />
            </span>
            <span className="hidden text-13 lg:inline">
              <Text path="library.tools.economy.enteringNow" />
            </span>
          </li>
        )}
      </ol>

      <div className="flex flex-col gap-2 lg:mt-2">
        {isConfirmingReset ? (
          <div className="rounded-chip border border-line bg-surface-2 p-3">
            <p className="text-12 text-ink">
              <Text path="library.tools.economy.confirmNewMatch" />
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
        ) : (
          <button
            type="button"
            onClick={onAskReset}
            disabled={rounds.length === 0}
            className={`${choiceClass(false)} disabled:opacity-40`}
          >
            <Text path="library.tools.economy.newMatch" />
          </button>
        )}
      </div>
    </aside>
  );
}
