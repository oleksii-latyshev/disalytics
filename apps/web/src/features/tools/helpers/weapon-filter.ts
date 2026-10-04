import type { WeaponReference, WeaponReferenceCategory } from '@disa/demo-core';

export type CategoryFilter = WeaponReferenceCategory | 'all';
export type SideFilter = 'all' | 'ct' | 't';

export interface WeaponFilter {
  readonly query: string;
  readonly category: CategoryFilter;
  readonly side: SideFilter;
}

export function filterWeapons(
  weapons: readonly WeaponReference[],
  filter: WeaponFilter,
): readonly WeaponReference[] {
  const query = filter.query.trim().toLowerCase();
  return weapons.filter((weapon) => {
    if (query !== '' && !weapon.name.toLowerCase().includes(query)) return false;
    if (filter.category !== 'all' && weapon.category !== filter.category) return false;
    if (filter.side !== 'all' && weapon.team !== 'both' && weapon.team !== filter.side)
      return false;
    return true;
  });
}

export function pickSelected(
  visible: readonly WeaponReference[],
  selectedName: string | null,
): WeaponReference | null {
  return visible.find((weapon) => weapon.name === selectedName) ?? visible[0] ?? null;
}
