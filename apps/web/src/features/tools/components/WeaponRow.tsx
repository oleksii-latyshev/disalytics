import type { ArmourState, WeaponReference } from '@disa/demo-core';
import { zoneDamage } from '../helpers/weapon-damage';
import { SideBadge } from './SideBadge';

const ROW_BASE = 'cursor-pointer transition-colors hover:bg-hover';

export function WeaponRow({
  weapon,
  armour,
  isSelected,
  moneyFormat,
  onSelect,
}: {
  weapon: WeaponReference;
  armour: ArmourState;
  isSelected: boolean;
  moneyFormat: Intl.NumberFormat;
  onSelect: (name: string) => void;
}) {
  const head = zoneDamage(weapon, 'head', armour);
  return (
    <tr
      onClick={() => onSelect(weapon.name)}
      className={`${ROW_BASE} ${isSelected ? 'bg-selected hover:bg-selected' : ''}`}
    >
      <th scope="row" className="px-4 py-2.5 text-left font-normal">
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(weapon.name);
          }}
          className="flex items-center gap-2.5 text-14 font-medium text-ink"
        >
          <SideBadge team={weapon.team} />
          {weapon.name}
        </button>
      </th>
      <td className="numeric px-2 py-2.5 text-right text-14 text-ink">
        {moneyFormat.format(weapon.price)}
      </td>
      <td className="numeric px-2 py-2.5 text-right text-14 text-ink-dim">
        {moneyFormat.format(weapon.killReward)}
      </td>
      <td className="numeric px-2 py-2.5 text-right text-14 text-ink-dim">{weapon.fireRateRpm}</td>
      <td className="numeric px-2 py-2.5 text-right text-14">
        <span
          className={
            head >= 100 ? 'rounded-chip bg-ink px-1.5 py-0.5 font-semibold text-surface-0' : ''
          }
        >
          {head}
        </span>
      </td>
      <td className="numeric px-2 py-2.5 text-right text-14">
        {zoneDamage(weapon, 'chest', armour)}
      </td>
      <td className="numeric px-2 py-2.5 text-right text-14">
        {zoneDamage(weapon, 'stomach', armour)}
      </td>
      <td className="numeric px-4 py-2.5 text-right text-14">
        {zoneDamage(weapon, 'legs', armour)}
      </td>
    </tr>
  );
}

export function WeaponCardRow({
  weapon,
  armour,
  isSelected,
  moneyFormat,
  onSelect,
}: {
  weapon: WeaponReference;
  armour: ArmourState;
  isSelected: boolean;
  moneyFormat: Intl.NumberFormat;
  onSelect: (name: string) => void;
}) {
  const head = zoneDamage(weapon, 'head', armour);
  return (
    <li className="[border-block-start:1px_solid_var(--color-line-soft)] first:border-0">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelect(weapon.name)}
        className={`grid h-12 w-full grid-cols-[minmax(0,1fr)_4rem_3rem] items-center gap-2 px-3.5 text-right transition-colors hover:bg-hover ${
          isSelected ? 'bg-selected hover:bg-selected' : ''
        }`}
      >
        <span className="flex min-w-0 items-center gap-2 text-left text-14 font-medium">
          <SideBadge team={weapon.team} />
          <span className="truncate">{weapon.name}</span>
        </span>
        <span className="numeric text-13">{moneyFormat.format(weapon.price)}</span>
        <span className="numeric text-13">
          <span
            className={
              head >= 100 ? 'rounded-chip bg-ink px-1.5 py-0.5 font-semibold text-surface-0' : ''
            }
          >
            {head}
          </span>
        </span>
      </button>
    </li>
  );
}
