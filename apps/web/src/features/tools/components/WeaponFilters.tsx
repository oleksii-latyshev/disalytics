import type { WeaponReferenceCategory } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { CategoryFilter, SideFilter } from '../helpers/weapon-filter';

const CATEGORIES = [
  ['all', 'library.tools.weapons.categories.all'],
  ['rifle', 'library.tools.weapons.categories.rifle'],
  ['pistol', 'library.tools.weapons.categories.pistol'],
  ['smg', 'library.tools.weapons.categories.smg'],
  ['sniper', 'library.tools.weapons.categories.sniper'],
  ['shotgun', 'library.tools.weapons.categories.shotgun'],
  ['machinegun', 'library.tools.weapons.categories.machinegun'],
  ['equipment', 'library.tools.weapons.categories.equipment'],
] as const satisfies readonly (readonly [WeaponReferenceCategory | 'all', string])[];

const SIDES = [
  ['all', 'library.tools.weapons.sides.all'],
  ['ct', 'library.tools.weapons.sides.ct'],
  ['t', 'library.tools.weapons.sides.t'],
] as const satisfies readonly (readonly [SideFilter, string])[];

const ARMOUR = [
  [true, 'library.tools.weapons.mode.armored'],
  [false, 'library.tools.weapons.mode.unarmored'],
] as const;

const GROUP =
  'm-0 min-w-0 flex gap-1 rounded-card bg-surface-1 p-1 shadow-[0_0_0_1px_var(--color-line)]';

function chip(isOn: boolean): string {
  return `h-8 shrink-0 rounded-chip px-2.5 font-ui text-13 font-medium transition-colors ${
    isOn ? 'bg-selected text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'
  }`;
}

export function WeaponFilters({
  category,
  side,
  isArmored,
  query,
  onCategory,
  onSide,
  onArmored,
  onQuery,
}: {
  category: CategoryFilter;
  side: SideFilter;
  isArmored: boolean;
  query: string;
  onCategory: (value: CategoryFilter) => void;
  onSide: (value: SideFilter) => void;
  onArmored: (value: boolean) => void;
  onQuery: (value: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <fieldset
        aria-label={t('library.tools.weapons.groups.category')}
        className={`${GROUP} max-w-full overflow-x-auto`}
      >
        {CATEGORIES.map(([value, path]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => onCategory(value)}
            className={chip(category === value)}
          >
            <Text path={path} />
          </button>
        ))}
      </fieldset>
      <fieldset aria-label={t('library.tools.weapons.groups.side')} className={GROUP}>
        {SIDES.map(([value, path]) => (
          <button
            key={value}
            type="button"
            aria-pressed={side === value}
            onClick={() => onSide(value)}
            className={`${chip(side === value)} ${value === 'all' ? '' : 'numeric'} ${
              value === 'ct' ? 'text-ct' : value === 't' ? 'text-t' : ''
            }`}
          >
            <Text path={path} />
          </button>
        ))}
      </fieldset>
      <fieldset aria-label={t('library.tools.weapons.groups.armour')} className={GROUP}>
        {ARMOUR.map(([value, path]) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={isArmored === value}
            onClick={() => onArmored(value)}
            className={chip(isArmored === value)}
          >
            <Text path={path} />
          </button>
        ))}
      </fieldset>
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        aria-label={t('library.tools.weapons.searchPlaceholder')}
        placeholder={t('library.tools.weapons.searchPlaceholder')}
        className="h-10 w-full rounded-card bg-surface-1 px-3.5 text-14 text-ink shadow-[0_0_0_1px_var(--color-line)] placeholder:text-ink-dim focus:shadow-[0_0_0_1px_var(--color-line-strong)] focus:outline-none sm:ml-auto sm:w-60"
      />
    </div>
  );
}
