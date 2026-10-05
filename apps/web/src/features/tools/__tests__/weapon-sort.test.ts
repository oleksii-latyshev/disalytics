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

  it('reads the damage for the armour state', () => {
    expect(getWeaponSortValue(ak, 'head', 'vestHelmet')).toBe(ak.hitgroupDamage.vestHelmet.head);
    expect(getWeaponSortValue(ak, 'head', 'vest')).toBe(ak.hitgroupDamage.none.head);
    expect(getWeaponSortValue(ak, 'chest', 'vest')).toBe(ak.hitgroupDamage.vest.chest);
    expect(getWeaponSortValue(ak, 'stomach', 'none')).toBe(ak.hitgroupDamage.none.stomach);
  });

  it('never lets armour change leg damage', () => {
    expect(getWeaponSortValue(ak, 'legs', 'vestHelmet')).toBe(ak.hitgroupDamage.none.legs);
  });

  it('reads plain fields', () => {
    expect(getWeaponSortValue(ak, 'price', 'vestHelmet')).toBe(ak.price);
    expect(getWeaponSortValue(ak, 'rpm', 'vestHelmet')).toBe(ak.fireRateRpm);
    expect(getWeaponSortValue(ak, 'name', 'vestHelmet')).toBe('AK-47');
  });
});

describe('compareWeapons', () => {
  const ak = weapon('AK-47');
  const awp = weapon('AWP');

  it('orders strings alphabetically and flips when descending', () => {
    expect(compareWeapons(ak, awp, 'name', true, 'vestHelmet')).toBeLessThan(0);
    expect(compareWeapons(ak, awp, 'name', false, 'vestHelmet')).toBeGreaterThan(0);
  });

  it('orders numbers and flips when descending', () => {
    expect(compareWeapons(ak, awp, 'price', true, 'vestHelmet')).toBeLessThan(0);
    expect(compareWeapons(ak, awp, 'price', false, 'vestHelmet')).toBeGreaterThan(0);
  });
});
