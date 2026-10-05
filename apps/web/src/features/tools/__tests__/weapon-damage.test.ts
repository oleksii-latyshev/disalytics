import { WEAPON_REFERENCES } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { shotsToKill, zoneDamage, zoneHeat } from '../helpers/weapon-damage';

const ak = WEAPON_REFERENCES.find((w) => w.name === 'AK-47');

describe('zoneDamage', () => {
  it('reads the value for the armour state, legs ignoring armour', () => {
    if (ak === undefined) throw new Error('missing AK-47');
    expect(zoneDamage(ak, 'head', 'vestHelmet')).toBe(ak.hitgroupDamage.vestHelmet.head);
    expect(zoneDamage(ak, 'head', 'vest')).toBe(ak.hitgroupDamage.none.head);
    expect(zoneDamage(ak, 'chest', 'none')).toBe(ak.hitgroupDamage.none.chest);
    expect(zoneDamage(ak, 'legs', 'vestHelmet')).toBe(zoneDamage(ak, 'legs', 'none'));
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
