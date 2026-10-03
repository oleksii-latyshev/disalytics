import {
  WEAPON_REFERENCES,
  type WeaponReference,
  type WeaponReferenceCategory,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { compareWeapons, type SortKey } from '../helpers/weapon-sort';
import { WeaponRow } from './WeaponRow';

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

const COLUMNS = [
  { key: 'name', label: 'library.tools.weapons.columns.weapon' },
  { key: 'category', label: 'library.tools.weapons.columns.category' },
  { key: 'team', label: 'library.tools.weapons.columns.side' },
  { key: 'price', label: 'library.tools.weapons.columns.price' },
  { key: 'killReward', label: 'library.tools.weapons.columns.killReward' },
  { key: 'rpm', label: 'library.tools.weapons.columns.rpm' },
  { key: 'armorPen', label: 'library.tools.weapons.columns.armorPen' },
  { key: 'head', label: 'library.tools.weapons.columns.head' },
  { key: 'chest', label: 'library.tools.weapons.columns.chest' },
  { key: 'stomach', label: 'library.tools.weapons.columns.stomach' },
  { key: 'legs', label: 'library.tools.weapons.columns.legs' },
] as const satisfies readonly { key: SortKey; label: string }[];

const SIDES = ['all', 'ct', 't'] as const;

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
              {COLUMNS.map(({ key, label }) => (
                <th key={key} scope="col" className="p-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort(key)}
                    className="flex items-center gap-1 hover:text-ink"
                  >
                    <Text path={label} />
                    {renderSortArrow(key)}
                  </button>
                </th>
              ))}
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
