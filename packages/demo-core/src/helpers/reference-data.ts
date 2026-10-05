/**
 * Game constants and reference values for CS2 grenades and weapons.
 *
 * Source citation:
 * - Grenade entity durations and lifespans measured from demo data in `docs/PARSER.md` §19–§23.
 * - Grenade prices, radii, and burn properties reflect Counter-Strike 2 release and the
 *   May 23, 2024 update (which reworked the CT Incendiary Grenade to $500 with reduced spread and duration).
 * - Weapon prices, kill rewards, base damage, headshot multipliers, armor penetration (ArmorRatio x 50),
 *   RPM (60 / CycleTime) and range modifiers come from Counter-Strike 2's `scripts/weapons.vdata`
 *   (SteamDatabase/GameTracking-CS2, commit c01c73dbaf67). Semi-auto pistols whose CycleTime is a
 *   `[0.15, 0.3]` pair keep 400 rpm; the Zeus keeps 30.
 *
 * Game version: Counter-Strike 2 (Current Release / MR12 / May 2024 incendiary adjustments).
 */

import type { WeaponName } from '../schema';
import type { UtilityKind } from './utility';

export interface GrenadeReference {
  readonly id: UtilityKind | 'incendiary';
  readonly name: string;
  readonly kind: UtilityKind;
  readonly team: 'both' | 'ct' | 't';
  readonly price: number;
  readonly durationSeconds: number | null;
  readonly radiusUnits: number | null;
  readonly maxDamage: number;
  readonly damageType: 'none' | 'fire' | 'explosive' | 'decoy';
  readonly citation: string;
}

export const GRENADE_REFERENCES: readonly GrenadeReference[] = [
  {
    id: 'smoke',
    name: 'Smoke Grenade',
    kind: 'smoke',
    team: 'both',
    price: 300,
    durationSeconds: 22.0,
    radiusUnits: 144,
    maxDamage: 0,
    damageType: 'none',
    citation: 'docs/PARSER.md §20 (median entity lifetime 22.0s post-detonation)',
  },
  {
    id: 'fire',
    name: 'Molotov',
    kind: 'fire',
    team: 't',
    price: 400,
    durationSeconds: 7.0,
    radiusUnits: 160,
    maxDamage: 40,
    damageType: 'fire',
    citation: 'CS2 release game rules (7.0s burn duration, ~40 DPS)',
  },
  {
    id: 'incendiary',
    name: 'Incendiary Grenade',
    kind: 'fire',
    team: 'ct',
    price: 500,
    durationSeconds: 5.5,
    radiusUnits: 130,
    maxDamage: 40,
    damageType: 'fire',
    citation: 'CS2 update May 23, 2024 ($500 cost, 5.5s duration, reduced spread)',
  },
  {
    id: 'flash',
    name: 'Flashbang',
    kind: 'flash',
    team: 'both',
    price: 200,
    durationSeconds: 4.87,
    radiusUnits: null,
    maxDamage: 0,
    damageType: 'none',
    citation: 'CS2 engine maximum blind duration (4.87s full blind + fade)',
  },
  {
    id: 'he',
    name: 'High Explosive Grenade',
    kind: 'he',
    team: 'both',
    price: 300,
    durationSeconds: null,
    radiusUnits: 350,
    maxDamage: 98,
    damageType: 'explosive',
    citation: 'docs/PARSER.md §20 (instant detonation, max 98 unarmored / 57 armored)',
  },
  {
    id: 'decoy',
    name: 'Decoy Grenade',
    kind: 'decoy',
    team: 'both',
    price: 50,
    durationSeconds: 14.9,
    radiusUnits: null,
    maxDamage: 5,
    damageType: 'decoy',
    citation: 'docs/PARSER.md §20 (14.9s lifespan until detonation explosion for 5 HP)',
  },
] as const;

export type ArmourState = 'none' | 'vest' | 'vestHelmet';

export const ARMOUR_STATES: readonly ArmourState[] = ['none', 'vest', 'vestHelmet'];

export type HitZone = 'head' | 'chest' | 'stomach' | 'legs';

export type ZoneDamage = Readonly<Record<HitZone, number>>;

export type HitgroupDamage = Readonly<Record<ArmourState, ZoneDamage>>;

export type WeaponReferenceCategory =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'sniper'
  | 'shotgun'
  | 'machinegun'
  | 'equipment';

export interface WeaponReference {
  readonly name: WeaponName;
  readonly category: WeaponReferenceCategory;
  readonly team: 'both' | 'ct' | 't';
  readonly price: number;
  readonly killReward: number;
  readonly baseDamage: number;
  readonly headshotMultiplier: number;
  readonly pellets?: number | undefined;
  readonly armorPenetration: number;
  readonly fireRateRpm: number;
  readonly rangeModifier: number;
  readonly hitgroupDamage: HitgroupDamage;
}

const BODY_MULTIPLIER: Record<HitZone, number> = {
  head: 1,
  chest: 1,
  stomach: 1.25,
  legs: 0.75,
};

function isProtected(zone: HitZone, armour: ArmourState): boolean {
  switch (zone) {
    case 'head':
      return armour === 'vestHelmet';
    case 'chest':
    case 'stomach':
      return armour !== 'none';
    case 'legs':
      return false;
  }
}

/**
 * CS2 hit damage against a target with 100 armour. Head uses the weapon's own headshot multiplier
 * (3.475 for the M4A1-S, 3.9 for the Desert Eagle), stomach 1.25x, legs 0.75x. Armour takes
 * health damage down to raw x ArmorRatio x 0.5 (the armour penetration percentage); the head is
 * covered only by a helmet, chest and stomach by the vest, and legs never. The armour points a
 * single bullet can eat never exceed 100, so the depletion rule does not change any figure.
 */
export function calculateHitgroupDamage(
  baseDamage: number,
  headshotMultiplier: number,
  armorPenetrationPercent: number,
): HitgroupDamage {
  const ap = armorPenetrationPercent / 100;
  const zoneDamage = (armour: ArmourState): ZoneDamage => {
    const damageOf = (zone: HitZone): number => {
      const multiplier = zone === 'head' ? headshotMultiplier : BODY_MULTIPLIER[zone];
      const raw = baseDamage * multiplier;
      return Math.floor(isProtected(zone, armour) ? raw * ap : raw);
    };
    return {
      head: damageOf('head'),
      chest: damageOf('chest'),
      stomach: damageOf('stomach'),
      legs: damageOf('legs'),
    };
  };
  return {
    none: zoneDamage('none'),
    vest: zoneDamage('vest'),
    vestHelmet: zoneDamage('vestHelmet'),
  };
}

function makeWeapon(
  name: WeaponName,
  category: WeaponReferenceCategory,
  team: 'both' | 'ct' | 't',
  stats: {
    readonly price: number;
    readonly killReward: number;
    readonly damage: number;
    readonly headshot?: number;
    readonly armorPenetration: number;
    readonly rpm: number;
    readonly range: number;
    readonly pellets?: number;
  },
): WeaponReference {
  const headshotMultiplier = stats.headshot ?? 4;
  return {
    name,
    category,
    team,
    price: stats.price,
    killReward: stats.killReward,
    baseDamage: stats.damage,
    headshotMultiplier,
    ...(stats.pellets !== undefined ? { pellets: stats.pellets } : {}),
    armorPenetration: stats.armorPenetration,
    fireRateRpm: stats.rpm,
    rangeModifier: stats.range,
    hitgroupDamage: calculateHitgroupDamage(
      stats.damage,
      headshotMultiplier,
      stats.armorPenetration,
    ),
  };
}

const W = makeWeapon;

export const WEAPON_REFERENCES: readonly WeaponReference[] = [
  W('Glock-18', 'pistol', 't', {
    price: 200,
    killReward: 300,
    damage: 30,
    armorPenetration: 47,
    rpm: 400,
    range: 0.85,
  }),
  W('USP-S', 'pistol', 'ct', {
    price: 200,
    killReward: 300,
    damage: 35,
    armorPenetration: 50.5,
    rpm: 353,
    range: 0.91,
  }),
  W('P2000', 'pistol', 'ct', {
    price: 200,
    killReward: 300,
    damage: 35,
    armorPenetration: 50.5,
    rpm: 353,
    range: 0.91,
  }),
  W('Dual Berettas', 'pistol', 'both', {
    price: 300,
    killReward: 300,
    damage: 38,
    armorPenetration: 57.5,
    rpm: 500,
    range: 0.79,
  }),
  W('P250', 'pistol', 'both', {
    price: 300,
    killReward: 300,
    damage: 38,
    armorPenetration: 64,
    rpm: 400,
    range: 0.9,
  }),
  W('Five-SeveN', 'pistol', 'ct', {
    price: 500,
    killReward: 300,
    damage: 32,
    armorPenetration: 91.15,
    rpm: 400,
    range: 0.81,
  }),
  W('Tec-9', 'pistol', 't', {
    price: 500,
    killReward: 300,
    damage: 33,
    armorPenetration: 90.6,
    rpm: 500,
    range: 0.79,
  }),
  W('CZ75-Auto', 'pistol', 'both', {
    price: 500,
    killReward: 300,
    damage: 31,
    armorPenetration: 77.65,
    rpm: 600,
    range: 0.85,
  }),
  W('Desert Eagle', 'pistol', 'both', {
    price: 700,
    killReward: 300,
    damage: 53,
    headshot: 3.9,
    armorPenetration: 93.2,
    rpm: 267,
    range: 0.85,
  }),
  W('R8 Revolver', 'pistol', 'both', {
    price: 600,
    killReward: 300,
    damage: 86,
    armorPenetration: 93.2,
    rpm: 120,
    range: 0.94,
  }),

  W('MAC-10', 'smg', 't', {
    price: 1050,
    killReward: 600,
    damage: 29,
    armorPenetration: 57.5,
    rpm: 800,
    range: 0.8,
  }),
  W('MP9', 'smg', 'ct', {
    price: 1250,
    killReward: 600,
    damage: 26,
    armorPenetration: 60,
    rpm: 857,
    range: 0.87,
  }),
  W('MP7', 'smg', 'both', {
    price: 1400,
    killReward: 600,
    damage: 30,
    armorPenetration: 62.5,
    rpm: 750,
    range: 0.87,
  }),
  W('MP5-SD', 'smg', 'both', {
    price: 1400,
    killReward: 600,
    damage: 28,
    armorPenetration: 62.5,
    rpm: 750,
    range: 0.87,
  }),
  W('UMP-45', 'smg', 'both', {
    price: 1200,
    killReward: 600,
    damage: 35,
    armorPenetration: 65,
    rpm: 667,
    range: 0.75,
  }),
  W('P90', 'smg', 'both', {
    price: 2350,
    killReward: 300,
    damage: 26,
    armorPenetration: 69,
    rpm: 857,
    range: 0.86,
  }),
  W('PP-Bizon', 'smg', 'both', {
    price: 1300,
    killReward: 600,
    damage: 27,
    armorPenetration: 63,
    rpm: 750,
    range: 0.8,
  }),

  W('Galil AR', 'rifle', 't', {
    price: 1800,
    killReward: 300,
    damage: 30,
    armorPenetration: 77.5,
    rpm: 667,
    range: 0.98,
  }),
  W('FAMAS', 'rifle', 'ct', {
    price: 1950,
    killReward: 300,
    damage: 30,
    armorPenetration: 70,
    rpm: 667,
    range: 0.96,
  }),
  W('AK-47', 'rifle', 't', {
    price: 2700,
    killReward: 300,
    damage: 36,
    armorPenetration: 77.5,
    rpm: 600,
    range: 0.98,
  }),
  W('M4A4', 'rifle', 'ct', {
    price: 2900,
    killReward: 300,
    damage: 33,
    armorPenetration: 70,
    rpm: 667,
    range: 0.97,
  }),
  W('M4A1-S', 'rifle', 'ct', {
    price: 2900,
    killReward: 300,
    damage: 38,
    headshot: 3.475,
    armorPenetration: 70,
    rpm: 600,
    range: 0.94,
  }),
  W('SG 553', 'rifle', 't', {
    price: 3000,
    killReward: 300,
    damage: 30,
    armorPenetration: 100,
    rpm: 545,
    range: 0.98,
  }),
  W('AUG', 'rifle', 'ct', {
    price: 3300,
    killReward: 300,
    damage: 28,
    armorPenetration: 90,
    rpm: 600,
    range: 0.98,
  }),

  W('SSG 08', 'sniper', 'both', {
    price: 1700,
    killReward: 300,
    damage: 88,
    armorPenetration: 85,
    rpm: 48,
    range: 0.98,
  }),
  W('AWP', 'sniper', 'both', {
    price: 4750,
    killReward: 100,
    damage: 115,
    armorPenetration: 97.5,
    rpm: 41,
    range: 0.99,
  }),
  W('G3SG1', 'sniper', 't', {
    price: 5000,
    killReward: 300,
    damage: 80,
    armorPenetration: 82.5,
    rpm: 240,
    range: 0.98,
  }),
  W('SCAR-20', 'sniper', 'ct', {
    price: 5000,
    killReward: 300,
    damage: 80,
    armorPenetration: 82.5,
    rpm: 240,
    range: 0.98,
  }),

  W('Nova', 'shotgun', 'both', {
    price: 1050,
    killReward: 900,
    damage: 26,
    armorPenetration: 50,
    rpm: 68,
    range: 0.7,
    pellets: 9,
  }),
  W('XM1014', 'shotgun', 'both', {
    price: 2000,
    killReward: 600,
    damage: 20,
    armorPenetration: 80,
    rpm: 171,
    range: 0.7,
    pellets: 6,
  }),
  W('Sawed-Off', 'shotgun', 't', {
    price: 1100,
    killReward: 900,
    damage: 32,
    armorPenetration: 75,
    rpm: 71,
    range: 0.45,
    pellets: 8,
  }),
  W('MAG-7', 'shotgun', 'ct', {
    price: 1300,
    killReward: 900,
    damage: 30,
    armorPenetration: 75,
    rpm: 71,
    range: 0.45,
    pellets: 8,
  }),

  W('M249', 'machinegun', 'both', {
    price: 5200,
    killReward: 300,
    damage: 32,
    armorPenetration: 80,
    rpm: 750,
    range: 0.97,
  }),
  W('Negev', 'machinegun', 'both', {
    price: 1700,
    killReward: 300,
    damage: 35,
    armorPenetration: 71,
    rpm: 800,
    range: 0.97,
  }),

  W('Zeus x27', 'equipment', 'both', {
    price: 200,
    killReward: 100,
    damage: 500,
    armorPenetration: 100,
    rpm: 30,
    range: 0.99,
  }),
];
