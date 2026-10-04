import { WEAPON_REFERENCES } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { useMemo, useState } from 'react';
import {
  type CategoryFilter,
  filterWeapons,
  pickSelected,
  type SideFilter,
} from '../helpers/weapon-filter';
import { compareWeapons, type SortKey } from '../helpers/weapon-sort';
import { WeaponDetail } from './WeaponDetail';
import { WeaponFilters } from './WeaponFilters';
import { WeaponCardRow, WeaponRow } from './WeaponRow';

const COLUMNS = [
  ['price', 'library.tools.weapons.columns.price'],
  ['killReward', 'library.tools.weapons.columns.killReward'],
  ['rpm', 'library.tools.weapons.columns.rpm'],
  ['head', 'library.tools.weapons.columns.head'],
  ['chest', 'library.tools.weapons.columns.chest'],
  ['stomach', 'library.tools.weapons.columns.stomach'],
  ['legs', 'library.tools.weapons.columns.legs'],
] as const satisfies readonly (readonly [SortKey, string])[];

export function WeaponReferenceTable() {
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
  const [category, setCategory] = useState<CategoryFilter>('rifle');
  const [side, setSide] = useState<SideFilter>('all');
  const [isArmored, setIsArmored] = useState(true);
  const [selectedName, setSelectedName] = useState<string | null>('AK-47');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean } | null>(null);

  const visible = useMemo(() => {
    const filtered = filterWeapons(WEAPON_REFERENCES, { query, category, side });
    if (sort === null) return filtered;
    return [...filtered].sort((a, b) => compareWeapons(a, b, sort.key, sort.asc, isArmored));
  }, [query, category, side, sort, isArmored]);

  const selected = pickSelected(visible, selectedName);

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({ key, asc: current?.key === key ? !current.asc : true }));

  return (
    <div className="flex flex-col gap-4">
      <WeaponFilters
        category={category}
        side={side}
        isArmored={isArmored}
        query={query}
        onCategory={setCategory}
        onSide={setSide}
        onArmored={setIsArmored}
        onQuery={setQuery}
      />

      {selected === null ? (
        <p className="py-10 text-center text-13 text-ink-dim">
          <Text path="library.tools.weapons.empty" />
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="lg:order-last">
            <WeaponDetail weapon={selected} isArmored={isArmored} moneyFormat={moneyFormat} />
          </div>

          <ul className="surface-card overflow-hidden rounded-card md:hidden">
            {visible.map((weapon) => (
              <WeaponCardRow
                key={weapon.name}
                weapon={weapon}
                isArmored={isArmored}
                isSelected={weapon.name === selected.name}
                moneyFormat={moneyFormat}
                onSelect={setSelectedName}
              />
            ))}
          </ul>

          <div className="surface-card hidden overflow-x-auto rounded-card md:block">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead>
                <tr className="h-10 text-right text-11 text-ink-dim">
                  <th scope="col" className="label-dense px-4 text-left font-medium">
                    <Text path="library.tools.weapons.columns.weapon" />
                  </th>
                  {COLUMNS.map(([key, path]) => (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={
                        sort?.key === key ? (sort.asc ? 'ascending' : 'descending') : undefined
                      }
                      className="label-dense px-2 font-medium last:px-4"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="uppercase hover:text-ink"
                      >
                        <Text path={path} />
                        {sort?.key === key && (sort.asc ? ' ↑' : ' ↓')}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {visible.map((weapon) => (
                  <WeaponRow
                    key={weapon.name}
                    weapon={weapon}
                    isArmored={isArmored}
                    isSelected={weapon.name === selected.name}
                    moneyFormat={moneyFormat}
                    onSelect={setSelectedName}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
