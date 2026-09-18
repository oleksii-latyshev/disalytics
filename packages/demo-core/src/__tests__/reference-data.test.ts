import { describe, expect, it } from 'vitest';
import {
  calculateHitgroupDamage,
  GRENADE_REFERENCES,
  WEAPON_REFERENCES,
} from '../helpers/reference-data';

describe('reference-data: grenades', () => {
  it('contains all canonical CS2 grenades with citations', () => {
    expect(GRENADE_REFERENCES.length).toBe(6);
    const names = GRENADE_REFERENCES.map((g) => g.name);
    expect(names).toContain('Smoke Grenade');
    expect(names).toContain('Molotov');
    expect(names).toContain('Incendiary Grenade');
    expect(names).toContain('Flashbang');
    expect(names).toContain('High Explosive Grenade');
    expect(names).toContain('Decoy Grenade');

    for (const g of GRENADE_REFERENCES) {
      expect(g.price).toBeGreaterThan(0);
      expect(g.citation.length).toBeGreaterThan(5);
    }
  });

  it('reflects measured demo durations from docs/PARSER.md', () => {
    const smoke = GRENADE_REFERENCES.find((g) => g.id === 'smoke');
    expect(smoke?.durationSeconds).toBe(22.0);

    const decoy = GRENADE_REFERENCES.find((g) => g.id === 'decoy');
    expect(decoy?.durationSeconds).toBe(14.9);
  });

  it('reflects the May 2024 incendiary rework', () => {
    const molotov = GRENADE_REFERENCES.find((g) => g.id === 'fire');
    const inc = GRENADE_REFERENCES.find((g) => g.id === 'incendiary');

    expect(molotov?.price).toBe(400);
    expect(molotov?.durationSeconds).toBe(7.0);

    expect(inc?.price).toBe(500);
    expect(inc?.durationSeconds).toBe(5.5);
    expect(inc?.radiusUnits).toBe(130);
  });
});

describe('reference-data: weapons', () => {
  it('correctly calculates hitgroup damage with and without armor', () => {
    // AK-47: 36 base damage, 77.5% armor penetration
    const ak47Damage = calculateHitgroupDamage(36, 77.5);
    expect(ak47Damage.head.unarmored).toBe(144);
    expect(ak47Damage.head.armored).toBe(111);
    expect(ak47Damage.chestArms.unarmored).toBe(36);
    expect(ak47Damage.chestArms.armored).toBe(27);
    expect(ak47Damage.stomach.unarmored).toBe(45);
    expect(ak47Damage.stomach.armored).toBe(34);
    // Legs are not reduced by armor in CS2
    expect(ak47Damage.legs.unarmored).toBe(27);
    expect(ak47Damage.legs.armored).toBe(27);
  });

  it('guarantees armored damage never exceeds unarmored damage', () => {
    for (const w of WEAPON_REFERENCES) {
      expect(w.hitgroupDamage.head.armored).toBeLessThanOrEqual(w.hitgroupDamage.head.unarmored);
      expect(w.hitgroupDamage.chestArms.armored).toBeLessThanOrEqual(
        w.hitgroupDamage.chestArms.unarmored,
      );
      expect(w.hitgroupDamage.stomach.armored).toBeLessThanOrEqual(
        w.hitgroupDamage.stomach.unarmored,
      );
      expect(w.hitgroupDamage.legs.armored).toBe(w.hitgroupDamage.legs.unarmored);
    }
  });

  it('assigns correct standard kill rewards', () => {
    const shotguns = WEAPON_REFERENCES.filter((w) => w.category === 'shotgun');
    for (const s of shotguns) {
      expect(s.killReward).toBe(900);
    }

    const smgsExceptP90 = WEAPON_REFERENCES.filter((w) => w.category === 'smg' && w.name !== 'P90');
    for (const smg of smgsExceptP90) {
      expect(smg.killReward).toBe(600);
    }

    const awp = WEAPON_REFERENCES.find((w) => w.name === 'AWP');
    expect(awp?.killReward).toBe(100);

    const cz75 = WEAPON_REFERENCES.find((w) => w.name === 'CZ75-Auto');
    expect(cz75?.killReward).toBe(100);

    const zeus = WEAPON_REFERENCES.find((w) => w.name === 'Zeus x27');
    expect(zeus?.killReward).toBe(0);
  });
});
