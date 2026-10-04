import {
  changeObservedWeaponCount,
  countObservedWeapons,
  type EnemyRoundObservation,
  OBSERVED_WEAPONS,
  type RoundEndReason,
  type Team,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { Dispatch, SetStateAction } from 'react';
import { COUNTS, REASON_PATHS, WEAPON_LABELS } from '../constants/economy';
import { choiceClass, reasonsForWinner } from '../helpers/economy-draft';

const UNKNOWN = (
  <>
    <span aria-hidden="true">?</span>
    <span className="sr-only">
      <Text path="library.tools.economy.unknown" />
    </span>
  </>
);

type Props = {
  draft: EnemyRoundObservation;
  setDraft: Dispatch<SetStateAction<EnemyRoundObservation>>;
  roundNumber: number;
  ourSide: Team;
  opponent: Team;
  isEditing: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
};

export function EconomyInputPanel({
  draft,
  setDraft,
  roundNumber,
  ourSide,
  opponent,
  isEditing,
  onSave,
  onCancelEdit,
  onRemove,
}: Props) {
  const t = useT();
  const winner = draft.weWon ? ourSide : opponent;
  const availableReasons: readonly RoundEndReason[] = reasonsForWinner(winner);
  const askingPlant = opponent === 'T' && draft.weWon;
  const knownWeapons = countObservedWeapons(draft.weapons);

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:rounded-card sm:border sm:border-line sm:bg-surface-1 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-20 font-semibold">
          <Text path="library.tools.economy.round" values={{ round: roundNumber }} />
        </h3>
        <span className="numeric text-12 text-ink-dim">
          <Text path="library.tools.economy.opponent" values={{ side: opponent }} />
        </span>
      </div>

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-13 text-ink-dim">
          <Text path="library.tools.economy.result" />
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {([true, false] as const).map((weWon) => (
            <button
              key={String(weWon)}
              type="button"
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  weWon,
                  reason: 'elimination',
                  enemySurvivors: weWon ? 0 : null,
                }))
              }
              aria-pressed={draft.weWon === weWon}
              className={choiceClass(draft.weWon === weWon)}
            >
              <Text path={weWon ? 'library.tools.economy.won' : 'library.tools.economy.lost'} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-13 text-ink-dim">
          <Text path="library.tools.economy.reason" />
        </legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
          {availableReasons.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  reason,
                  enemySurvivors: reason === 'elimination' && previous.weWon ? 0 : null,
                }))
              }
              aria-pressed={draft.reason === reason}
              className={choiceClass(draft.reason === reason)}
            >
              <Text path={REASON_PATHS[reason]} />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-13 text-ink-dim">
            <Text path="library.tools.economy.survivors" />
          </legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
            {([null, ...COUNTS] as const).map((count) => (
              <button
                key={String(count)}
                type="button"
                onClick={() => setDraft((previous) => ({ ...previous, enemySurvivors: count }))}
                aria-pressed={draft.enemySurvivors === count}
                className={choiceClass(draft.enemySurvivors === count)}
              >
                {count === null ? UNKNOWN : count}
              </button>
            ))}
          </div>
        </fieldset>

        {askingPlant && (
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-13 text-ink-dim">
              <Text path="library.tools.economy.bombPlanted" />
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {([null, true, false] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, bombPlanted: value }))}
                  aria-pressed={draft.bombPlanted === value}
                  className={choiceClass(draft.bombPlanted === value)}
                >
                  {value === null ? (
                    UNKNOWN
                  ) : (
                    <Text path={value ? 'library.tools.economy.yes' : 'library.tools.economy.no'} />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-13 text-ink-dim">
            <Text path="library.tools.economy.weaponsTitle" />
          </span>
          <span className="numeric text-12 text-ink-dim">
            <Text path="library.tools.economy.known" values={{ count: knownWeapons }} />
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]">
          {OBSERVED_WEAPONS.map((weapon) => {
            const display = WEAPON_LABELS[weapon];
            const label = 'name' in display ? display.name : t(display.path);
            return (
              <div
                key={weapon}
                className="flex min-w-0 items-center gap-2 rounded-chip border border-line bg-surface-1 py-1.5 pr-1.5 pl-3 sm:flex-col sm:gap-1.5 sm:border-0 sm:bg-surface-2 sm:px-2 sm:py-2.5"
              >
                <span className="min-w-0 flex-1 text-14 sm:flex-none sm:text-13">{label}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={draft.weapons[weapon] === 0}
                    onClick={() =>
                      setDraft((previous) => ({
                        ...previous,
                        weapons: changeObservedWeaponCount(previous.weapons, weapon, -1),
                      }))
                    }
                    aria-label={t('library.tools.economy.decreaseWeapon', {
                      weapon: label,
                    })}
                    className="flex size-12 items-center justify-center rounded-chip border border-line-strong text-ink disabled:opacity-30 sm:size-9"
                  >
                    −
                  </button>
                  <span className="numeric w-6 text-center text-16">{draft.weapons[weapon]}</span>
                  <button
                    type="button"
                    disabled={knownWeapons >= 5}
                    onClick={() =>
                      setDraft((previous) => ({
                        ...previous,
                        weapons: changeObservedWeaponCount(previous.weapons, weapon, 1),
                      }))
                    }
                    aria-label={t('library.tools.economy.increaseWeapon', {
                      weapon: label,
                    })}
                    className="flex size-12 items-center justify-center rounded-chip border border-line-strong text-ink disabled:opacity-30 sm:size-9"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-13 text-ink-dim">
          <Text path="library.tools.economy.enemyKills" />
        </legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
          {([null, ...COUNTS] as const).map((count) => (
            <button
              key={String(count)}
              type="button"
              onClick={() => setDraft((previous) => ({ ...previous, enemyKills: count }))}
              aria-pressed={draft.enemyKills === count}
              className={choiceClass(draft.enemyKills === count)}
            >
              {count === null ? UNKNOWN : count}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          className="min-h-12 flex-1 rounded-card bg-ink px-5 text-14 font-semibold text-surface-0 hover:opacity-90 sm:min-h-11 sm:flex-none"
        >
          <Text path="library.tools.economy.save" values={{ round: roundNumber }} />
        </button>
        {isEditing && (
          <>
            <button
              type="button"
              onClick={onCancelEdit}
              className="min-h-12 px-2 text-13 text-ink-dim hover:text-ink sm:min-h-11"
            >
              <Text path="library.tools.economy.cancelEdit" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="min-h-12 px-2 text-13 text-ink-dim hover:text-ink sm:min-h-11"
            >
              <Text path="library.tools.economy.removeRound" values={{ round: roundNumber }} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
