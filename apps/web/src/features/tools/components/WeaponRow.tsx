import type { WeaponReference } from '@disa/demo-core';

export function WeaponRow({
  weapon,
  isArmored,
  moneyFormat,
}: {
  weapon: WeaponReference;
  isArmored: boolean;
  moneyFormat: Intl.NumberFormat;
}) {
  const headDmg = isArmored
    ? weapon.hitgroupDamage.head.armored
    : weapon.hitgroupDamage.head.unarmored;
  const chestDmg = isArmored
    ? weapon.hitgroupDamage.chestArms.armored
    : weapon.hitgroupDamage.chestArms.unarmored;
  const stomachDmg = isArmored
    ? weapon.hitgroupDamage.stomach.armored
    : weapon.hitgroupDamage.stomach.unarmored;
  const legsDmg = weapon.hitgroupDamage.legs.unarmored;

  return (
    <tr className="transition-colors hover:bg-hover">
      <td className="p-3 font-medium text-ink">{weapon.name}</td>
      <td className="p-3 text-12 text-ink-dim capitalize">{weapon.category}</td>
      <td className="p-3">
        <span
          className={`label-dense rounded-chip px-1.5 py-0.5 text-10 font-medium ${
            weapon.team === 'ct'
              ? 'bg-surface-2 text-ct'
              : weapon.team === 't'
                ? 'bg-surface-2 text-t'
                : 'bg-surface-2 text-ink-dim'
          }`}
        >
          {weapon.team.toUpperCase()}
        </span>
      </td>
      <td className="numeric p-3 text-ink">{moneyFormat.format(weapon.price)}</td>
      <td className="numeric p-3 text-ink-dim">
        {weapon.killReward > 0 ? moneyFormat.format(weapon.killReward) : '—'}
      </td>
      <td className="numeric p-3 text-ink-dim">{weapon.fireRateRpm}</td>
      <td className="numeric p-3 text-ink-dim">{weapon.armorPenetration}%</td>
      <td className={`numeric p-3 font-medium ${headDmg >= 100 ? 'text-damage' : 'text-ink'}`}>
        {headDmg}
        {weapon.pellets ? ` (×${weapon.pellets})` : ''}
      </td>
      <td className="numeric p-3 text-ink-dim">
        {chestDmg}
        {weapon.pellets ? ` (×${weapon.pellets})` : ''}
      </td>
      <td className="numeric p-3 text-ink-dim">
        {stomachDmg}
        {weapon.pellets ? ` (×${weapon.pellets})` : ''}
      </td>
      <td className="numeric p-3 text-ink-dim">
        {legsDmg}
        {weapon.pellets ? ` (×${weapon.pellets})` : ''}
      </td>
    </tr>
  );
}
