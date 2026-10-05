import type { ArmourState, WeaponReference } from '@disa/demo-core';

export type SortKey =
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

export function getWeaponSortValue(
  w: WeaponReference,
  key: SortKey,
  armour: ArmourState,
): number | string {
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
    case 'chest':
    case 'stomach':
    case 'legs':
      return w.hitgroupDamage[armour][key];
  }
}

export function compareWeapons(
  a: WeaponReference,
  b: WeaponReference,
  key: SortKey,
  asc: boolean,
  armour: ArmourState,
): number {
  const valA = getWeaponSortValue(a, key, armour);
  const valB = getWeaponSortValue(b, key, armour);

  if (typeof valA === 'string' && typeof valB === 'string') {
    const comp = valA.localeCompare(valB);
    return asc ? comp : -comp;
  }
  return asc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
}
