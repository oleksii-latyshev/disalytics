/**
 * Game constants and reference values for CS2 grenades and weapons.
 *
 * Source citation:
 * - Grenade entity durations and lifespans measured from demo data in `docs/PARSER.md` §19–§23.
 * - Grenade prices, radii, and burn properties reflect Counter-Strike 2 release and the
 *   May 23, 2024 update (which reworked the CT Incendiary Grenade to $500 with reduced spread and duration).
 * - Weapon prices, kill rewards, armor penetration percentages, RPM, range modifiers, and base damage
 *   derive from Valve's Counter-Strike 2 release definition tables (`items_game.txt` / engine convars).
 *
 * Game version: Counter-Strike 2 (Current Release / MR12 / May 2024 incendiary adjustments).
 */

import type { WeaponId } from '../schema';
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

export interface HitgroupValues {
  readonly unarmored: number;
  readonly armored: number;
}

export interface HitgroupDamage {
  readonly head: HitgroupValues;
  readonly chestArms: HitgroupValues;
  readonly stomach: HitgroupValues;
  readonly legs: HitgroupValues;
}

export type WeaponReferenceCategory =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'sniper'
  | 'shotgun'
  | 'machinegun'
  | 'equipment';

export interface WeaponReference {
  readonly name: WeaponId;
  readonly category: WeaponReferenceCategory;
  readonly team: 'both' | 'ct' | 't';
  readonly price: number;
  readonly killReward: number;
  readonly baseDamage: number;
  readonly pellets?: number | undefined;
  readonly armorPenetration: number;
  readonly fireRateRpm: number;
  readonly rangeModifier: number;
  readonly hitgroupDamage: HitgroupDamage;
}

/**
 * Standard CS2 hitgroup calculation:
 * Head: 4.0x, Stomach: 1.25x, Chest/Arms: 1.0x, Legs: 0.75x.
 * Armor penetration reduces unarmored damage proportionally; legs are exempt from armor reduction.
 */
export function calculateHitgroupDamage(
  baseDamage: number,
  armorPenetrationPercent: number,
): HitgroupDamage {
  const ap = armorPenetrationPercent / 100;
  const headUnarmored = Math.floor(baseDamage * 4);
  const chestUnarmored = Math.floor(baseDamage * 1);
  const stomachUnarmored = Math.floor(baseDamage * 1.25);
  const legsUnarmored = Math.floor(baseDamage * 0.75);

  return {
    head: {
      unarmored: headUnarmored,
      armored: Math.floor(headUnarmored * ap),
    },
    chestArms: {
      unarmored: chestUnarmored,
      armored: Math.floor(chestUnarmored * ap),
    },
    stomach: {
      unarmored: stomachUnarmored,
      armored: Math.floor(stomachUnarmored * ap),
    },
    legs: {
      unarmored: legsUnarmored,
      armored: legsUnarmored,
    },
  };
}

function makeWeapon(
  name: WeaponId,
  category: WeaponReferenceCategory,
  team: 'both' | 'ct' | 't',
  price: number,
  killReward: number,
  baseDamage: number,
  armorPenetration: number,
  fireRateRpm: number,
  rangeModifier: number,
  pellets?: number,
): WeaponReference {
  return {
    name,
    category,
    team,
    price,
    killReward,
    baseDamage,
    ...(pellets !== undefined ? { pellets } : {}),
    armorPenetration,
    fireRateRpm,
    rangeModifier,
    hitgroupDamage: calculateHitgroupDamage(baseDamage, armorPenetration),
  };
}

export const WEAPON_REFERENCES: readonly WeaponReference[] = [
  // Pistols
  makeWeapon('Glock-18', 'pistol', 't', 200, 300, 30, 47, 400, 0.9),
  makeWeapon('USP-S', 'pistol', 'ct', 200, 300, 35, 50.5, 353, 0.91),
  makeWeapon('P2000', 'pistol', 'ct', 200, 300, 35, 50.5, 353, 0.91),
  makeWeapon('Dual Berettas', 'pistol', 'both', 300, 300, 38, 57.5, 500, 0.79),
  makeWeapon('P250', 'pistol', 'both', 300, 300, 38, 64, 400, 0.85),
  makeWeapon('Five-SeveN', 'pistol', 'ct', 500, 300, 32, 91.15, 400, 0.88),
  makeWeapon('Tec-9', 'pistol', 't', 500, 300, 33, 90.6, 500, 0.85),
  makeWeapon('CZ75-Auto', 'pistol', 'both', 500, 100, 31, 77.65, 600, 0.85),
  makeWeapon('Desert Eagle', 'pistol', 'both', 700, 300, 53, 93.2, 267, 0.85),
  makeWeapon('R8 Revolver', 'pistol', 'both', 600, 300, 86, 93.2, 150, 0.88),

  // SMGs
  makeWeapon('MAC-10', 'smg', 't', 1050, 600, 29, 57.5, 800, 0.82),
  makeWeapon('MP9', 'smg', 'ct', 1250, 600, 26, 60, 857, 0.87),
  makeWeapon('MP7', 'smg', 'both', 1500, 600, 29, 62.5, 750, 0.84),
  makeWeapon('MP5-SD', 'smg', 'both', 1500, 600, 27, 62.5, 750, 0.84),
  makeWeapon('UMP-45', 'smg', 'both', 1200, 600, 35, 65, 667, 0.75),
  makeWeapon('P90', 'smg', 'both', 2350, 300, 26, 69, 857, 0.86),
  makeWeapon('PP-Bizon', 'smg', 'both', 1400, 600, 27, 63, 750, 0.8),

  // Rifles
  makeWeapon('Galil AR', 'rifle', 't', 1800, 300, 30, 77.5, 667, 0.98),
  makeWeapon('FAMAS', 'rifle', 'ct', 2050, 300, 30, 70, 667, 0.96),
  makeWeapon('AK-47', 'rifle', 't', 2700, 300, 36, 77.5, 600, 0.98),
  makeWeapon('M4A4', 'rifle', 'ct', 3000, 300, 33, 70, 667, 0.97),
  makeWeapon('M4A1-S', 'rifle', 'ct', 2900, 300, 38, 70, 600, 0.99),
  makeWeapon('SG 553', 'rifle', 't', 3000, 300, 30, 100, 545, 0.98),
  makeWeapon('AUG', 'rifle', 'ct', 3300, 300, 28, 90, 667, 0.98),

  // Snipers
  makeWeapon('SSG 08', 'sniper', 'both', 1700, 300, 88, 85, 48, 0.98),
  makeWeapon('AWP', 'sniper', 'both', 4750, 100, 115, 97.5, 41, 0.99),
  makeWeapon('G3SG1', 'sniper', 't', 5000, 300, 80, 82.5, 240, 0.98),
  makeWeapon('SCAR-20', 'sniper', 'ct', 5000, 300, 80, 82.5, 240, 0.98),

  // Shotguns
  makeWeapon('Nova', 'shotgun', 'both', 1050, 900, 26, 50, 68, 0.7, 9),
  makeWeapon('XM1014', 'shotgun', 'both', 2000, 900, 20, 80, 171, 0.7, 6),
  makeWeapon('Sawed-Off', 'shotgun', 't', 1100, 900, 32, 75, 71, 0.67, 8),
  makeWeapon('MAG-7', 'shotgun', 'ct', 1300, 900, 30, 75, 71, 0.75, 8),

  // Machine guns
  makeWeapon('M249', 'machinegun', 'both', 5200, 300, 32, 80, 750, 0.97),
  makeWeapon('Negev', 'machinegun', 'both', 1700, 300, 35, 71, 800, 0.97),

  // Equipment
  makeWeapon('Zeus x27', 'equipment', 'both', 200, 0, 500, 100, 30, 0.05),
];
