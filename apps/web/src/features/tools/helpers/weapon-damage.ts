import type { WeaponReference } from '@disa/demo-core';

export type Zone = 'head' | 'chest' | 'stomach' | 'legs';

export const ZONES: readonly Zone[] = ['head', 'chest', 'stomach', 'legs'];

const TARGET_HEALTH = 100;

export function zoneDamage(weapon: WeaponReference, zone: Zone, isArmored: boolean): number {
  const { head, chestArms, stomach, legs } = weapon.hitgroupDamage;
  switch (zone) {
    case 'head':
      return isArmored ? head.armored : head.unarmored;
    case 'chest':
      return isArmored ? chestArms.armored : chestArms.unarmored;
    case 'stomach':
      return isArmored ? stomach.armored : stomach.unarmored;
    case 'legs':
      return legs.unarmored;
  }
}

export function shotsToKill(damage: number): number {
  if (damage <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(TARGET_HEALTH / damage);
}

export function zoneHeat(damage: number, ceiling = 120): number {
  return Math.min(1, Math.max(0, damage / ceiling));
}
