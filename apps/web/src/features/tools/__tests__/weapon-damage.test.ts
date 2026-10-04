import { WEAPON_REFERENCES } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { shotsToKill, zoneDamage, zoneHeat } from '../helpers/weapon-damage';

const ak = WEAPON_REFERENCES.find((w) => w.name === 'AK-47');

describe('zoneDamage', () => {
  it('reads armoured and unarmoured values, legs ignoring armour', () => {
    if (ak === undefined) throw new Error('missing AK-47');
    expect(zoneDamage(ak, 'head', true)).toBe(ak.hitgroupDamage.head.armored);
    expect(zoneDamage(ak, 'chest', false)).toBe(ak.hitgroupDamage.chestArms.unarmored);
    expect(zoneDamage(ak, 'legs', true)).toBe(zoneDamage(ak, 'legs', false));
  });
});

describe('shotsToKill', () => {
  it('rounds up against 100 health', () => {
    expect(shotsToKill(36)).toBe(3);
    expect(shotsToKill(25)).toBe(4);
    expect(shotsToKill(100)).toBe(1);
    expect(shotsToKill(460)).toBe(1);
  });

  it('never resolves for zero damage', () => {
    expect(shotsToKill(0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('zoneHeat', () => {
  it('clamps to 0..1', () => {
    expect(zoneHeat(60)).toBe(0.5);
    expect(zoneHeat(500)).toBe(1);
    expect(zoneHeat(-5)).toBe(0);
  });
});
