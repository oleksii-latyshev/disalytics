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
  const weapon = (name: string) => {
    const found = WEAPON_REFERENCES.find((w) => w.name === name);
    if (found === undefined) throw new Error(`missing weapon ${name}`);
    return found;
  };

  it('computes each zone for every armour state', () => {
    const ak = calculateHitgroupDamage(36, 4, 77.5);
    expect(ak.none).toEqual({ head: 144, chest: 36, stomach: 45, legs: 27 });
    expect(ak.vest).toEqual({ head: 144, chest: 27, stomach: 34, legs: 27 });
    expect(ak.vestHelmet).toEqual({ head: 111, chest: 27, stomach: 34, legs: 27 });
  });

  it('lets the AK-47 kill with one head shot through a helmet, and the M4s not', () => {
    expect(weapon('AK-47').hitgroupDamage.vestHelmet.head).toBe(111);
    expect(weapon('M4A1-S').hitgroupDamage.vestHelmet.head).toBe(92);
    expect(weapon('M4A4').hitgroupDamage.vestHelmet.head).toBe(92);
  });

  it('uses the weapon headshot multiplier rather than a flat 4', () => {
    expect(weapon('M4A1-S').headshotMultiplier).toBe(3.475);
    expect(weapon('M4A1-S').hitgroupDamage.none.head).toBe(132);
    expect(weapon('Desert Eagle').headshotMultiplier).toBe(3.9);
    expect(weapon('Desert Eagle').hitgroupDamage.none.head).toBe(206);
    expect(weapon('Desert Eagle').hitgroupDamage.vestHelmet.head).toBe(192);
    expect(weapon('AWP').hitgroupDamage.none.head).toBe(460);
    expect(weapon('AWP').hitgroupDamage.vestHelmet.head).toBe(448);
    expect(weapon('SSG 08').hitgroupDamage.vestHelmet.head).toBe(299);
  });

  it('reduces the head only with a helmet and the body only with a vest', () => {
    for (const w of WEAPON_REFERENCES) {
      const { none, vest, vestHelmet } = w.hitgroupDamage;
      expect(vest.head).toBe(none.head);
      expect(vestHelmet.head).toBeLessThanOrEqual(none.head);
      expect(vest.chest).toBeLessThanOrEqual(none.chest);
      expect(vestHelmet.chest).toBe(vest.chest);
      expect(vestHelmet.stomach).toBe(vest.stomach);
      expect(vest.legs).toBe(none.legs);
      expect(vestHelmet.legs).toBe(none.legs);
    }
  });

  it('reads armour penetration as ArmorRatio x 50', () => {
    expect(weapon('AK-47').armorPenetration).toBe(77.5);
    expect(weapon('Desert Eagle').armorPenetration).toBe(93.2);
    expect(weapon('MP7').price).toBe(1400);
    expect(weapon('MP7').baseDamage).toBe(30);
    expect(weapon('M4A4').price).toBe(2900);
  });

  it('assigns correct standard kill rewards', () => {
    const shotguns = WEAPON_REFERENCES.filter(
      (w) => w.category === 'shotgun' && w.name !== 'XM1014',
    );
    for (const s of shotguns) {
      expect(s.killReward).toBe(900);
    }
    expect(weapon('XM1014').killReward).toBe(600);

    const smgsExceptP90 = WEAPON_REFERENCES.filter((w) => w.category === 'smg' && w.name !== 'P90');
    for (const smg of smgsExceptP90) {
      expect(smg.killReward).toBe(600);
    }

    const awp = WEAPON_REFERENCES.find((w) => w.name === 'AWP');
    expect(awp?.killReward).toBe(100);

    expect(weapon('CZ75-Auto').killReward).toBe(300);
    expect(weapon('Zeus x27').killReward).toBe(100);
  });
});
