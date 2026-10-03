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

type Props = {
  draft: EnemyRoundObservation;
  setDraft: Dispatch<SetStateAction<EnemyRoundObservation>>;
  roundNumber: number;
  ourSide: Team;
  opponent: Team;
  isEditing: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
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
}: Props) {
  const t = useT();
  const winner = draft.weWon ? ourSide : opponent;
  const availableReasons: readonly RoundEndReason[] = reasonsForWinner(winner);
  const askingPlant = opponent === 'T' && draft.weWon;
  const knownWeapons = countObservedWeapons(draft.weapons);

  return (
    <div className="min-w-0 rounded-card border border-line bg-surface-1 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-11 tracking-[0.12em] text-ink-dim uppercase">
            <Text path="library.tools.economy.inputEyebrow" />
          </p>
          <h4 className="mt-2 text-20 font-medium">
            <Text path="library.tools.economy.round" values={{ round: roundNumber }} />
          </h4>
        </div>
        <span className="text-12 text-ink-dim">
          <Text path="library.tools.economy.opponent" values={{ side: opponent }} />
        </span>
      </div>

      <fieldset className="mb-5 border-0 p-0">
        <legend className="mb-2 text-12 font-medium">
          <Text path="library.tools.economy.result" />
        </legend>
        <div className="flex flex-wrap gap-2">
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

      <fieldset className="mb-5 border-0 p-0">
        <legend className="mb-2 text-12 font-medium">
          <Text path="library.tools.economy.reason" />
        </legend>
        <div className="flex flex-wrap gap-2">
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

      <fieldset className="mb-5 border-0 p-0">
        <legend className="mb-2 text-12 font-medium">
          <Text path="library.tools.economy.survivors" />
        </legend>
        <div className="flex flex-wrap gap-2">
          {([null, ...COUNTS] as const).map((count) => (
            <button
              key={String(count)}
              type="button"
              onClick={() => setDraft((previous) => ({ ...previous, enemySurvivors: count }))}
              aria-pressed={draft.enemySurvivors === count}
              className={choiceClass(draft.enemySurvivors === count)}
            >
              {count === null ? <Text path="library.tools.economy.unknown" /> : count}
            </button>
          ))}
        </div>
      </fieldset>

      {askingPlant && (
        <fieldset className="mb-5 border-0 p-0">
          <legend className="mb-2 text-12 font-medium">
            <Text path="library.tools.economy.bombPlanted" />
          </legend>
          <div className="flex flex-wrap gap-2">
            {([null, true, false] as const).map((value) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setDraft((previous) => ({ ...previous, bombPlanted: value }))}
                aria-pressed={draft.bombPlanted === value}
                className={choiceClass(draft.bombPlanted === value)}
              >
                <Text
                  path={
                    value === null
                      ? 'library.tools.economy.unknown'
                      : value
                        ? 'library.tools.economy.yes'
                        : 'library.tools.economy.no'
                  }
                />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="[border-block-start:1px_solid_var(--color-line)] pt-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h5 className="text-14 font-medium">
              <Text path="library.tools.economy.weaponsTitle" />
            </h5>
            <p className="mt-1 text-12 text-ink-dim">
              <Text path="library.tools.economy.weaponsHint" />
            </p>
          </div>
          <span className="numeric text-12 text-ink-dim">
            <Text path="library.tools.economy.known" values={{ count: knownWeapons }} />
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {OBSERVED_WEAPONS.map((weapon) => {
            const display = WEAPON_LABELS[weapon];
            const label = 'name' in display ? display.name : t(display.path);
            return (
              <div
                key={weapon}
                className="flex min-w-0 items-center justify-between gap-2 rounded-chip border border-line bg-surface-2 px-3 py-2"
              >
                <span className="min-w-0 text-12">{label}</span>
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
                    className="flex size-11 items-center justify-center rounded-chip bg-surface-3 text-ink disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="numeric w-5 text-center text-13">{draft.weapons[weapon]}</span>
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
                    className="flex size-11 items-center justify-center rounded-chip bg-surface-3 text-ink disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <fieldset className="mt-5 border-0 p-0">
        <legend className="mb-2 text-12 font-medium">
          <Text path="library.tools.economy.enemyKills" />
        </legend>
        <div className="flex flex-wrap gap-2">
          {([null, ...COUNTS] as const).map((count) => (
            <button
              key={String(count)}
              type="button"
              onClick={() => setDraft((previous) => ({ ...previous, enemyKills: count }))}
              aria-pressed={draft.enemyKills === count}
              className={choiceClass(draft.enemyKills === count)}
            >
              {count === null ? <Text path="library.tools.economy.unknown" /> : count}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          className="min-h-10 rounded-card bg-ink px-5 py-2 text-13 font-medium text-surface-0 hover:opacity-90"
        >
          <Text
            path={isEditing ? 'library.tools.economy.saveRound' : 'library.tools.economy.addRound'}
          />
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-12 text-ink-dim hover:text-ink"
          >
            <Text path="library.tools.economy.cancelEdit" />
          </button>
        )}
      </div>
    </div>
  );
}
