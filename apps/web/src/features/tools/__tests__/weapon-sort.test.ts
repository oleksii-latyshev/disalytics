import { WEAPON_REFERENCES, type WeaponReference } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { compareWeapons, getWeaponSortValue } from '../helpers/weapon-sort';

function weapon(name: string): WeaponReference {
  const found = WEAPON_REFERENCES.find((entry) => entry.name === name);
  if (found === undefined) throw new Error(`missing weapon ${name}`);
  return found;
}

describe('getWeaponSortValue', () => {
  const ak = weapon('AK-47');

  it('reads the armored or unarmored damage for body hitgroups', () => {
    expect(getWeaponSortValue(ak, 'head', true)).toBe(ak.hitgroupDamage.head.armored);
    expect(getWeaponSortValue(ak, 'head', false)).toBe(ak.hitgroupDamage.head.unarmored);
    expect(getWeaponSortValue(ak, 'chest', true)).toBe(ak.hitgroupDamage.chestArms.armored);
    expect(getWeaponSortValue(ak, 'stomach', false)).toBe(ak.hitgroupDamage.stomach.unarmored);
  });

  it('always reads unarmored leg damage', () => {
    expect(getWeaponSortValue(ak, 'legs', true)).toBe(ak.hitgroupDamage.legs.unarmored);
  });

  it('reads plain fields', () => {
    expect(getWeaponSortValue(ak, 'price', true)).toBe(ak.price);
    expect(getWeaponSortValue(ak, 'rpm', true)).toBe(ak.fireRateRpm);
    expect(getWeaponSortValue(ak, 'name', true)).toBe('AK-47');
  });
});

describe('compareWeapons', () => {
  const ak = weapon('AK-47');
  const awp = weapon('AWP');

  it('orders strings alphabetically and flips when descending', () => {
    expect(compareWeapons(ak, awp, 'name', true, true)).toBeLessThan(0);
    expect(compareWeapons(ak, awp, 'name', false, true)).toBeGreaterThan(0);
  });

  it('orders numbers and flips when descending', () => {
    expect(compareWeapons(ak, awp, 'price', true, true)).toBeLessThan(0);
    expect(compareWeapons(ak, awp, 'price', false, true)).toBeGreaterThan(0);
  });
});
