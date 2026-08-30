import {
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
  type GrenadeType,
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

/**
 * What class every entry of `MatchHeader.weapons` belongs to, in the order `TickTrack.weapon` and
 * `Shot.weapon` index them. Derived once per demo and read by index afterwards: the plate resolves
 * a class per player per animation frame, and a string lookup per token per frame is the walk
 * `AGENTS.md` §8 keeps out of a draw.
 *
 * A `weapon` sample of `WEAPON_NONE` falls outside this table on purpose — no sample ever saw that
 * slot holding anything, which is a different answer from `unknown` and is drawn as one.
 */
export function weaponClasses(weapons: readonly WeaponId[]): readonly WeaponClass[] {
  return weapons.map(weaponClass);
}

// Upstream's *internal* vocabulary, which is what `Kill.weapon` and `Damage.weapon` carry —
// `ak47`, `m4a1_silencer`, `inferno` — and a different vocabulary from the display names
// `MatchHeader.weapons` holds (docs/PARSER.md §17). The two tables are both here, side by side and
// separately named, rather than merged into one lookup that would answer either: #53 is what
// unifies them, and a merged table would hide the split it exists to close.
const CLASS_BY_INTERNAL_NAME: Readonly<Record<string, WeaponClass>> = {
  cz75a: 'pistol',
  deagle: 'pistol',
  elite: 'pistol',
  fiveseven: 'pistol',
  glock: 'pistol',
  hkp2000: 'pistol',
  p250: 'pistol',
  revolver: 'pistol',
  tec9: 'pistol',
  usp_silencer: 'pistol',

  bizon: 'smg',
  mac10: 'smg',
  mp5sd: 'smg',
  mp7: 'smg',
  mp9: 'smg',
  p90: 'smg',
  ump45: 'smg',

  ak47: 'rifle',
  aug: 'rifle',
  famas: 'rifle',
  galilar: 'rifle',
  m4a1: 'rifle',
  m4a1_silencer: 'rifle',
  sg556: 'rifle',

  awp: 'sniper',
  g3sg1: 'sniper',
  scar20: 'sniper',
  ssg08: 'sniper',

  mag7: 'shotgun',
  nova: 'shotgun',
  sawedoff: 'shotgun',
  xm1014: 'shotgun',

  m249: 'machinegun',
  negev: 'machinegun',

  taser: 'zeus',
  c4: 'bomb',

  decoy: 'decoy',
  flashbang: 'flash',
  hegrenade: 'he',
  // The burning area rather than the thrown grenade: a molotov kills as `inferno`, and both the
  // molotov and the incendiary answer `fire` for the reason `weaponClass` gives them one class.
  inferno: 'fire',
  incgrenade: 'fire',
  molotov: 'fire',
  smokegrenade: 'smoke',
};

/**
 * What a kill or a damage event was dealt with. A **separate vocabulary** from `weaponClass`, which
 * reads the display names on `MatchHeader.weapons`; calling that one with `ak47` answers `unknown`
 * for every kill in the match, which is the trap this function exists to close.
 *
 * Knives are matched by prefix rather than enumerated. The field carries the skin — the fixture
 * alone holds `knife_butterfly`, `knife_cord` and `knife_m9_bayonet` — and Valve adds them faster
 * than a table can be maintained, so a knife nobody here has heard of still reads as a knife.
 *
 * A kill by the world (`world`, or the empty string) has no weapon and answers `unknown`, the same
 * as a weapon this table has never seen. Both are drawn as an absence rather than as a placeholder.
 */
export function killWeaponClass(weapon: WeaponId): WeaponClass {
  if (weapon.startsWith('knife') || weapon === 'bayonet') return 'knife';

  return CLASS_BY_INTERNAL_NAME[weapon] ?? 'unknown';
}

/**
 * What a thrown grenade is, as one of the kinds a glyph exists for. Molotov and incendiary answer
 * the same `fire` for the reason `weaponClass` gives them one class, and the switch is exhaustive
 * with no `default` so a new `GrenadeType` is a compile error rather than an unmarked glyph.
 */
export function utilityKindOfGrenade(type: GrenadeType): UtilityKind {
  switch (type) {
    case 'hegrenade':
      return 'he';
    case 'flashbang':
      return 'flash';
    case 'smokegrenade':
      return 'smoke';
    case 'molotov':
    case 'incgrenade':
      return 'fire';
    case 'decoy':
      return 'decoy';
  }
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
 * `Molotov` is the half of that pair that reads as the category — it is what both are called in
 * play, where an `Incendiary Grenade` names only the CT's own item and never the T's.
 */
export const UTILITY_NAMES: Readonly<Record<UtilityKind, string>> = {
  he: 'HE Grenade',
  flash: 'Flashbang',
  smoke: 'Smoke Grenade',
  fire: 'Molotov',
  decoy: 'Decoy Grenade',
  kit: 'Defuse Kit',
};

/**
 * What to call a weapon a player is holding. Utility answers `UTILITY_NAMES` rather than its own
 * `MatchHeader.weapons` entry, so a grenade in the hands and the same grenade in the marks beside it
 * carry one name.
 *
 * The deference has to run this way round. The weapon table separates a `Molotov` from an
 * `Incendiary Grenade` and the `grenades` bitfield cannot, so as long as either reading comes off
 * the table the two disagree for one of them — and the reading a reader hears twice in one row is
 * the one that has to give.
 *
 * A gun keeps its entry, which is upstream's display name and the only name it has. Unifying that
 * vocabulary with the one `Kill.weapon` carries is #53.
 */
export function weaponName(weapon: WeaponId): string {
  const kind = weaponClass(weapon);

  return isUtilityKind(kind) ? UTILITY_NAMES[kind] : weapon;
}

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
