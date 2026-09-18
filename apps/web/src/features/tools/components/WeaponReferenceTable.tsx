import {
  WEAPON_REFERENCES,
  type WeaponReference,
  type WeaponReferenceCategory,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { useMemo, useState } from 'react';

type SortKey =
  | 'name'
  | 'category'
  | 'team'
  | 'price'
  | 'killReward'
  | 'rpm'
  | 'armorPen'
  | 'head'
  | 'chest'
  | 'stomach'
  | 'legs';

const CATEGORIES: readonly (WeaponReferenceCategory | 'all')[] = [
  'all',
  'rifle',
  'pistol',
  'smg',
  'sniper',
  'shotgun',
  'machinegun',
  'equipment',
];

const SIDES = ['all', 'ct', 't'] as const;

function getWeaponSortValue(w: WeaponReference, key: SortKey, isArmored: boolean): number | string {
  switch (key) {
    case 'name':
      return w.name;
    case 'category':
      return w.category;
    case 'team':
      return w.team;
    case 'price':
      return w.price;
    case 'killReward':
      return w.killReward;
    case 'rpm':
      return w.fireRateRpm;
    case 'armorPen':
      return w.armorPenetration;
    case 'head':
      return isArmored ? w.hitgroupDamage.head.armored : w.hitgroupDamage.head.unarmored;
    case 'chest':
      return isArmored ? w.hitgroupDamage.chestArms.armored : w.hitgroupDamage.chestArms.unarmored;
    case 'stomach':
      return isArmored ? w.hitgroupDamage.stomach.armored : w.hitgroupDamage.stomach.unarmored;
    case 'legs':
      return w.hitgroupDamage.legs.unarmored;
  }
}

function compareWeapons(
  a: WeaponReference,
  b: WeaponReference,
  key: SortKey,
  asc: boolean,
  isArmored: boolean,
): number {
  const valA = getWeaponSortValue(a, key, isArmored);
  const valB = getWeaponSortValue(b, key, isArmored);

  if (typeof valA === 'string' && typeof valB === 'string') {
    const comp = valA.localeCompare(valB);
    return asc ? comp : -comp;
  }
  return asc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
}

function WeaponRow({
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

export function WeaponReferenceTable() {
  const t = useT();
  const locale = useLocale();
  const moneyFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WeaponReferenceCategory | 'all'>('all');
  const [selectedSide, setSelectedSide] = useState<'all' | 'ct' | 't'>('all');
  const [isArmored, setIsArmored] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredWeapons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WEAPON_REFERENCES.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q)) return false;
      if (selectedCategory !== 'all' && w.category !== selectedCategory) return false;
      if (selectedSide !== 'all' && w.team !== 'both' && w.team !== selectedSide) return false;
      return true;
    });
  }, [query, selectedCategory, selectedSide]);

  const sortedWeapons = useMemo(() => {
    return [...filteredWeapons].sort((a, b) => compareWeapons(a, b, sortKey, sortAsc, isArmored));
  }, [filteredWeapons, sortKey, sortAsc, isArmored]);

  const renderSortArrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="text-10 text-ink">{sortAsc ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('library.tools.weapons.searchPlaceholder')}
            className="h-8 w-full rounded-card border border-line bg-surface-2 px-3 text-13 text-ink placeholder:text-ink-dim focus:border-line-strong focus:outline-none"
          />
        </div>

        {/* Armor Mode Toggle */}
        <div className="flex items-center gap-1 rounded-card bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => setIsArmored(true)}
            className={`h-7 rounded-chip px-2.5 font-ui text-12 font-medium transition-colors ${
              isArmored ? 'bg-surface-0 text-ink shadow-xs' : 'text-ink-dim hover:text-ink'
            }`}
          >
            <Text path="library.tools.weapons.mode.armored" />
          </button>
          <button
            type="button"
            onClick={() => setIsArmored(false)}
            className={`h-7 rounded-chip px-2.5 font-ui text-12 font-medium transition-colors ${
              !isArmored ? 'bg-surface-0 text-ink shadow-xs' : 'text-ink-dim hover:text-ink'
            }`}
          >
            <Text path="library.tools.weapons.mode.unarmored" />
          </button>
        </div>
      </div>

      {/* Filter rows */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`h-7 rounded-chip px-2.5 font-ui text-12 font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface-2 text-ink-dim hover:bg-surface-3 hover:text-ink'
              }`}
            >
              {cat === 'all' && <Text path="library.tools.weapons.categories.all" />}
              {cat === 'rifle' && <Text path="library.tools.weapons.categories.rifle" />}
              {cat === 'pistol' && <Text path="library.tools.weapons.categories.pistol" />}
              {cat === 'smg' && <Text path="library.tools.weapons.categories.smg" />}
              {cat === 'sniper' && <Text path="library.tools.weapons.categories.sniper" />}
              {cat === 'shotgun' && <Text path="library.tools.weapons.categories.shotgun" />}
              {cat === 'machinegun' && <Text path="library.tools.weapons.categories.machinegun" />}
              {cat === 'equipment' && <Text path="library.tools.weapons.categories.equipment" />}
            </button>
          ))}
        </div>

        <div className="mx-1 h-4 w-px bg-line" />

        <div className="flex items-center gap-1">
          {SIDES.map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setSelectedSide(side)}
              className={`h-7 rounded-chip px-2 font-ui text-12 font-medium transition-colors ${
                selectedSide === side
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface-2 text-ink-dim hover:bg-surface-3 hover:text-ink'
              }`}
            >
              {side === 'all' && <Text path="library.tools.weapons.sides.all" />}
              {side === 'ct' && <Text path="library.tools.weapons.sides.ct" />}
              {side === 't' && <Text path="library.tools.weapons.sides.t" />}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-x-auto rounded-card">
        <table className="w-full min-w-[50rem] border-collapse text-left">
          <thead>
            <tr className="[border-block-end:1px_solid_var(--color-line)] bg-surface-2 text-11 text-ink-dim">
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.weapon" />
                  {renderSortArrow('name')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.category" />
                  {renderSortArrow('category')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('team')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.side" />
                  {renderSortArrow('team')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.price" />
                  {renderSortArrow('price')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('killReward')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.killReward" />
                  {renderSortArrow('killReward')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('rpm')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.rpm" />
                  {renderSortArrow('rpm')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('armorPen')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.armorPen" />
                  {renderSortArrow('armorPen')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('head')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.head" />
                  {renderSortArrow('head')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('chest')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.chest" />
                  {renderSortArrow('chest')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('stomach')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.stomach" />
                  {renderSortArrow('stomach')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('legs')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.weapons.columns.legs" />
                  {renderSortArrow('legs')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-13">
            {sortedWeapons.map((w: WeaponReference) => (
              <WeaponRow key={w.name} weapon={w} isArmored={isArmored} moneyFormat={moneyFormat} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
