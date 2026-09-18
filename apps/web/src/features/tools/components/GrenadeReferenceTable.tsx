import { GRENADE_REFERENCES, type GrenadeReference } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { useMemo, useState } from 'react';

type SortKey = 'name' | 'team' | 'price' | 'duration' | 'radius' | 'damage';

function getGrenadeSortValue(g: GrenadeReference, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return g.name;
    case 'team':
      return g.team;
    case 'price':
      return g.price;
    case 'duration':
      return g.durationSeconds ?? 0;
    case 'radius':
      return g.radiusUnits ?? 0;
    case 'damage':
      return g.maxDamage;
  }
}

function compareGrenades(
  a: GrenadeReference,
  b: GrenadeReference,
  key: SortKey,
  asc: boolean,
): number {
  const valA = getGrenadeSortValue(a, key);
  const valB = getGrenadeSortValue(b, key);

  if (typeof valA === 'string' && typeof valB === 'string') {
    const comp = valA.localeCompare(valB);
    return asc ? comp : -comp;
  }
  return asc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
}

function GrenadeRow({
  grenade,
  moneyFormat,
}: {
  grenade: GrenadeReference;
  moneyFormat: Intl.NumberFormat;
}) {
  return (
    <tr className="transition-colors hover:bg-hover">
      <td className="p-3 font-medium text-ink">{grenade.name}</td>
      <td className="p-3">
        <span
          className={`label-dense rounded-chip px-1.5 py-0.5 text-10 font-medium ${
            grenade.team === 'ct'
              ? 'bg-surface-2 text-ct'
              : grenade.team === 't'
                ? 'bg-surface-2 text-t'
                : 'bg-surface-2 text-ink-dim'
          }`}
        >
          {grenade.team.toUpperCase()}
        </span>
      </td>
      <td className="numeric p-3 text-ink">{moneyFormat.format(grenade.price)}</td>
      <td className="numeric p-3 text-ink-dim">
        {grenade.durationSeconds !== null ? (
          <Text
            path="library.tools.grenades.seconds"
            values={{ seconds: grenade.durationSeconds }}
          />
        ) : (
          <Text path="library.tools.grenades.instant" />
        )}
      </td>
      <td className="numeric p-3 text-ink-dim">
        {grenade.radiusUnits !== null ? (
          <Text path="library.tools.grenades.units" values={{ units: grenade.radiusUnits }} />
        ) : grenade.kind === 'flash' ? (
          <Text path="library.tools.grenades.los" />
        ) : (
          '—'
        )}
      </td>
      <td className="numeric p-3 text-ink">
        {grenade.maxDamage > 0 ? (
          grenade.damageType === 'fire' ? (
            <Text path="library.tools.grenades.dps" />
          ) : (
            grenade.maxDamage
          )
        ) : (
          <Text path="library.tools.grenades.none" />
        )}
      </td>
      <td className="max-w-[20rem] p-3 text-11 text-ink-dim leading-normal">{grenade.citation}</td>
    </tr>
  );
}

export function GrenadeReferenceTable() {
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

  const [sortKey, setSortKey] = useState<SortKey>('price');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedGrenades = useMemo(() => {
    return [...GRENADE_REFERENCES].sort((a, b) => compareGrenades(a, b, sortKey, sortAsc));
  }, [sortKey, sortAsc]);

  const renderSortArrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="text-10 text-ink">{sortAsc ? ' ↑' : ' ↓'}</span>;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="surface-card overflow-x-auto rounded-card">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="[border-block-end:1px_solid_var(--color-line)] bg-surface-2 text-11 text-ink-dim">
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.grenades.columns.grenade" />
                  {renderSortArrow('name')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('team')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.grenades.columns.side" />
                  {renderSortArrow('team')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.grenades.columns.price" />
                  {renderSortArrow('price')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('duration')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.grenades.columns.duration" />
                  {renderSortArrow('duration')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('radius')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.grenades.columns.radius" />
                  {renderSortArrow('radius')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('damage')}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  <Text path="library.tools.grenades.columns.damage" />
                  {renderSortArrow('damage')}
                </button>
              </th>
              <th scope="col" className="p-3 font-medium">
                <Text path="library.tools.grenades.columns.citation" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-13">
            {sortedGrenades.map((g: GrenadeReference) => (
              <GrenadeRow key={g.id} grenade={g} moneyFormat={moneyFormat} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
