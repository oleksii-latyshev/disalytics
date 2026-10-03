import type { WeaponReference } from '@disa/demo-core';

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
  isArmored: boolean,
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
      return isArmored ? w.hitgroupDamage.head.armored : w.hitgroupDamage.head.unarmored;
    case 'chest':
      return isArmored ? w.hitgroupDamage.chestArms.armored : w.hitgroupDamage.chestArms.unarmored;
    case 'stomach':
      return isArmored ? w.hitgroupDamage.stomach.armored : w.hitgroupDamage.stomach.unarmored;
    case 'legs':
      return w.hitgroupDamage.legs.unarmored;
  }
}

export function compareWeapons(
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
