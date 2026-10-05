import type { ArmourState, HitZone, WeaponReference } from '@disa/demo-core';

export type Zone = HitZone;

export const ZONES: readonly Zone[] = ['head', 'chest', 'stomach', 'legs'];

const TARGET_HEALTH = 100;

export function zoneDamage(weapon: WeaponReference, zone: Zone, armour: ArmourState): number {
  return weapon.hitgroupDamage[armour][zone];
}

export function shotsToKill(damage: number): number {
  if (damage <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(TARGET_HEALTH / damage);
}

export function zoneHeat(damage: number, ceiling = 120): number {
  return Math.min(1, Math.max(0, damage / ceiling));
}
