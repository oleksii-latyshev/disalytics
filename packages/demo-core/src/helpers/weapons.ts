import {
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
  type WeaponId,
} from '../schema';

/** The utility a player can be carrying, which is what one bit of the `grenades` bitfield means. */
export type UtilityKind = 'he' | 'flash' | 'smoke' | 'fire' | 'decoy' | 'kit';

/**
 * What a weapon is, at the resolution a reader needs while a round plays: enough to tell an AWP
 * from a rifle from a pistol without reading a name off a five-row card.
 *
 * Held utility resolves to its own kind rather than to one "grenade" class, because a player about
 * to throw a flash and a player about to throw a smoke are not the same information. `bomb` exists
 * so `docs/DESIGN.md` §6.4's rendering rule has something to match on; `unknown` is the whole reason
 * this is a lookup rather than an enumeration — `MatchHeader.weapons` is built per match from what
 * the demo said, so a weapon nobody here has heard of must draw *something* rather than fail.
 */
export type WeaponClass =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'sniper'
  | 'shotgun'
  | 'machinegun'
  | 'knife'
  | 'zeus'
  | 'bomb'
  | 'unknown'
  | UtilityKind;

// Upstream's display-name vocabulary — a different vocabulary from `Kill.weapon`, and the one
// `MatchHeader.weapons` carries. Knives arrive collapsed to a single `Knife` entry, so no skin
// name reaches this table (docs/PARSER.md §17).
const CLASS_BY_NAME: Readonly<Record<string, WeaponClass>> = {
  'CZ75-Auto': 'pistol',
  'Desert Eagle': 'pistol',
  'Dual Berettas': 'pistol',
  'Five-SeveN': 'pistol',
  'Glock-18': 'pistol',
  P250: 'pistol',
  P2000: 'pistol',
  'R8 Revolver': 'pistol',
  'Tec-9': 'pistol',
  'USP-S': 'pistol',

  'MAC-10': 'smg',
  'MP5-SD': 'smg',
  MP7: 'smg',
  MP9: 'smg',
  P90: 'smg',
  'PP-Bizon': 'smg',
  'UMP-45': 'smg',

  'AK-47': 'rifle',
  AUG: 'rifle',
  FAMAS: 'rifle',
  'Galil AR': 'rifle',
  'M4A1-S': 'rifle',
  M4A4: 'rifle',
  'SG 553': 'rifle',

  AWP: 'sniper',
  G3SG1: 'sniper',
  'SCAR-20': 'sniper',
  'SSG 08': 'sniper',

  'MAG-7': 'shotgun',
  Nova: 'shotgun',
  'Sawed-Off': 'shotgun',
  XM1014: 'shotgun',

  M249: 'machinegun',
  Negev: 'machinegun',

  Knife: 'knife',
  'Zeus x27': 'zeus',
  'C4 Explosive': 'bomb',

  'Decoy Grenade': 'decoy',
  Flashbang: 'flash',
  'High Explosive Grenade': 'he',
  'Incendiary Grenade': 'fire',
  Molotov: 'fire',
  'Smoke Grenade': 'smoke',
};

/**
 * What class a weapon belongs to. Molotov and incendiary answer the same `fire`, for the reason the
 * `grenades` bitfield gives them one bit: they are the same thing to a reader deciding whether a
 * corner is deniable.
 */
export function weaponClass(weapon: WeaponId): WeaponClass {
  return CLASS_BY_NAME[weapon] ?? 'unknown';
}

const UTILITY_KINDS = new Set<WeaponClass>(['he', 'flash', 'smoke', 'fire', 'decoy', 'kit']);

/** Whether a class is a piece of utility, which is drawn by its own mark rather than a silhouette. */
export function isUtilityKind(weapon: WeaponClass): weapon is UtilityKind {
  return UTILITY_KINDS.has(weapon);
}

/**
 * Canonical names for what a player is carrying — game vocabulary, never translated (`AGENTS.md`
 * §11). Molotov and incendiary share `fire` and therefore share a name; the distinction is one the
 * bitfield does not carry and one a reader deciding whether a corner is deniable does not need.
 */
export const UTILITY_NAMES: Readonly<Record<UtilityKind, string>> = {
  he: 'HE Grenade',
  flash: 'Flashbang',
  smoke: 'Smoke Grenade',
  fire: 'Molotov',
  decoy: 'Decoy Grenade',
  kit: 'Defuse Kit',
};

export interface UtilityHeld {
  /** The `GRENADE_*` bit this came from, which is what identifies it in a list of two flashbangs. */
  readonly bit: number;
  readonly kind: UtilityKind;
}

// The order utility is carried in, which is the order it is drawn in. Fixed rather than derived
// from the bit values, so adding a bit cannot silently re-order five glyphs a reader scans by
// position. The second flashbang repeats the kind: two flashes are two marks, not a count.
const KIND_BY_BIT: readonly UtilityHeld[] = [
  { bit: GRENADE_HE, kind: 'he' },
  { bit: GRENADE_FLASH, kind: 'flash' },
  { bit: GRENADE_FLASH_SECOND, kind: 'flash' },
  { bit: GRENADE_SMOKE, kind: 'smoke' },
  { bit: GRENADE_FIRE, kind: 'fire' },
  { bit: GRENADE_DECOY, kind: 'decoy' },
  { bit: GRENADE_DEFUSE_KIT, kind: 'kit' },
];

/** What a `TickTrack.grenades` bitfield holds, in drawing order. */
export function utilityHeld(grenades: number): readonly UtilityHeld[] {
  return KIND_BY_BIT.filter((held) => (grenades & held.bit) !== 0);
}
