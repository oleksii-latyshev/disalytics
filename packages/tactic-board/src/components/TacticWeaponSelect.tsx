import {
  type TacticSide,
  tacticWeaponChoices,
  type WeaponReferenceCategory,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { useId } from 'react';

export interface TacticWeaponSelectProps {
  readonly side: TacticSide;
  readonly weapon: string | undefined;
  readonly className: string;
  readonly onWeapon: (weapon: string | null) => void;
}

const ANY = '';

const CATEGORY_KEYS = [
  ['pistol', 'library.tools.weapons.categories.pistol'],
  ['smg', 'library.tools.weapons.categories.smg'],
  ['rifle', 'library.tools.weapons.categories.rifle'],
  ['sniper', 'library.tools.weapons.categories.sniper'],
  ['shotgun', 'library.tools.weapons.categories.shotgun'],
  ['machinegun', 'library.tools.weapons.categories.machinegun'],
  ['equipment', 'library.tools.weapons.categories.equipment'],
] as const satisfies readonly (readonly [WeaponReferenceCategory, string])[];

/** The gun a player buys for the round, from the side's buy menu; "any" when it does not matter. */
export function TacticWeaponSelect({ side, weapon, className, onWeapon }: TacticWeaponSelectProps) {
  const t = useT();
  const id = useId();
  const choices = tacticWeaponChoices(side);

  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-12 text-ink-dim">
      {t('library.tactics.board.player.weapon')}
      <select
        id={id}
        value={weapon ?? ANY}
        onChange={(event) => onWeapon(event.target.value === ANY ? null : event.target.value)}
        className={className}
      >
        <option value={ANY}>{t('library.tactics.board.player.weaponAny')}</option>
        {CATEGORY_KEYS.map(([category, key]) => {
          const inCategory = choices.filter((choice) => choice.category === category);
          if (inCategory.length === 0) return null;
          return (
            <optgroup key={category} label={t(key)}>
              {inCategory.map((choice) => (
                <option key={choice.name} value={choice.name}>
                  {choice.name} · {t('library.tactics.loadout.cost', { amount: choice.price })}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}
