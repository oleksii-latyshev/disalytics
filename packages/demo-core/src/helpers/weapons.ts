import type { WeaponId } from '../schema';
import { UTILITY_NAMES, type UtilityKind } from './utility';
import { isWeaponIconId, type WeaponIconId } from './weapon-icons';

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

interface WeaponFacts {
  readonly kind: WeaponClass;
  /**
   * The silhouette that names this exact model. Utility draws its own mark and the bomb draws
   * nothing at all (`docs/DESIGN.md` §6.4), so neither of them names one.
   */
  readonly icon: WeaponIconId | undefined;
}

// Upstream's display-name vocabulary — a different vocabulary from `Kill.weapon`, and the one
// `MatchHeader.weapons` carries. Knives arrive collapsed to a single `Knife` entry, so no skin
// name reaches this table (docs/PARSER.md §17).
const WEAPONS_BY_NAME: Readonly<Record<string, WeaponFacts>> = {
  'CZ75-Auto': { kind: 'pistol', icon: 'cz75a' },
  'Desert Eagle': { kind: 'pistol', icon: 'deagle' },
  'Dual Berettas': { kind: 'pistol', icon: 'elite' },
  'Five-SeveN': { kind: 'pistol', icon: 'fiveseven' },
  'Glock-18': { kind: 'pistol', icon: 'glock' },
  P250: { kind: 'pistol', icon: 'p250' },
  P2000: { kind: 'pistol', icon: 'hkp2000' },
  'R8 Revolver': { kind: 'pistol', icon: 'revolver' },
  'Tec-9': { kind: 'pistol', icon: 'tec9' },
  'USP-S': { kind: 'pistol', icon: 'usp_silencer' },

  'MAC-10': { kind: 'smg', icon: 'mac10' },
  'MP5-SD': { kind: 'smg', icon: 'mp5sd' },
  MP7: { kind: 'smg', icon: 'mp7' },
  MP9: { kind: 'smg', icon: 'mp9' },
  P90: { kind: 'smg', icon: 'p90' },
  'PP-Bizon': { kind: 'smg', icon: 'bizon' },
  'UMP-45': { kind: 'smg', icon: 'ump45' },

  'AK-47': { kind: 'rifle', icon: 'ak47' },
  AUG: { kind: 'rifle', icon: 'aug' },
  FAMAS: { kind: 'rifle', icon: 'famas' },
  'Galil AR': { kind: 'rifle', icon: 'galilar' },
  'M4A1-S': { kind: 'rifle', icon: 'm4a1_silencer' },
  M4A4: { kind: 'rifle', icon: 'm4a1' },
  'SG 553': { kind: 'rifle', icon: 'sg556' },

  AWP: { kind: 'sniper', icon: 'awp' },
  G3SG1: { kind: 'sniper', icon: 'g3sg1' },
  'SCAR-20': { kind: 'sniper', icon: 'scar20' },
  'SSG 08': { kind: 'sniper', icon: 'ssg08' },

  'MAG-7': { kind: 'shotgun', icon: 'mag7' },
  Nova: { kind: 'shotgun', icon: 'nova' },
  'Sawed-Off': { kind: 'shotgun', icon: 'sawedoff' },
  XM1014: { kind: 'shotgun', icon: 'xm1014' },

  M249: { kind: 'machinegun', icon: 'm249' },
  Negev: { kind: 'machinegun', icon: 'negev' },

  Knife: { kind: 'knife', icon: 'knife' },
  'Zeus x27': { kind: 'zeus', icon: 'taser' },
  'C4 Explosive': { kind: 'bomb', icon: undefined },

  'Decoy Grenade': { kind: 'decoy', icon: undefined },
  Flashbang: { kind: 'flash', icon: undefined },
  'High Explosive Grenade': { kind: 'he', icon: undefined },
  'Incendiary Grenade': { kind: 'fire', icon: undefined },
  Molotov: { kind: 'fire', icon: undefined },
  'Smoke Grenade': { kind: 'smoke', icon: undefined },
};

/**
 * What class a weapon belongs to. Molotov and incendiary answer the same `fire`, for the reason the
 * `grenades` bitfield gives them one bit: they are the same thing to a reader deciding whether a
 * corner is deniable.
 */
export function weaponClass(weapon: WeaponId): WeaponClass {
  return WEAPONS_BY_NAME[weapon]?.kind ?? 'unknown';
}

/**
 * The icon that names the exact model a player is holding — an M4A4 rather than a rifle. It answers
 * `undefined` for utility, for the bomb and for a weapon this table has never seen; each of those
 * still draws, by falling back to the class `weaponClass` gives it.
 */
export function weaponIcon(weapon: WeaponId): WeaponIconId | undefined {
  return WEAPONS_BY_NAME[weapon]?.icon;
}

/**
 * The model every entry of `MatchHeader.weapons` names an icon for, in the order `TickTrack.weapon`
 * and `Shot.weapon` index them — `weaponClasses`' pair, derived once per demo and read by index for
 * the same reason.
 *
 * An entry with no icon of its own holds `undefined`, which is the answer utility, the bomb and a
 * weapon this repository has never drawn all give: each of them falls back to the class beside it
 * in `weaponClasses`, rather than leaving a reader with an empty box.
 */
export function weaponIcons(weapons: readonly WeaponId[]): readonly (WeaponIconId | undefined)[] {
  return weapons.map(weaponIcon);
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

/**
 * Upstream's *internal* vocabulary — what `Kill.weapon` and `Damage.weapon` carry — against the
 * entry the same object has in `MatchHeader.weapons`. Two vocabularies for one weapon is
 * `docs/PARSER.md` §17's finding, and this is the bridge rather than the unification: the tables
 * stay separate, nothing here is canonical, and a weapon reached through this one still answers
 * with a name upstream chose. #53 is what makes a single enumerated vocabulary out of them.
 *
 * A class or a name is therefore stated **once**, on the display table above. This one maps and
 * nothing else, so the day an entry there is corrected the kill feed is corrected with it.
 */
const ENTRY_BY_INTERNAL_NAME: Readonly<Record<string, WeaponId>> = {
  cz75a: 'CZ75-Auto',
  deagle: 'Desert Eagle',
  elite: 'Dual Berettas',
  fiveseven: 'Five-SeveN',
  glock: 'Glock-18',
  hkp2000: 'P2000',
  p250: 'P250',
  revolver: 'R8 Revolver',
  tec9: 'Tec-9',
  usp_silencer: 'USP-S',

  bizon: 'PP-Bizon',
  mac10: 'MAC-10',
  mp5sd: 'MP5-SD',
  mp7: 'MP7',
  mp9: 'MP9',
  p90: 'P90',
  ump45: 'UMP-45',

  ak47: 'AK-47',
  aug: 'AUG',
  famas: 'FAMAS',
  galilar: 'Galil AR',
  m4a1: 'M4A4',
  m4a1_silencer: 'M4A1-S',
  sg556: 'SG 553',

  awp: 'AWP',
  g3sg1: 'G3SG1',
  scar20: 'SCAR-20',
  ssg08: 'SSG 08',

  mag7: 'MAG-7',
  nova: 'Nova',
  sawedoff: 'Sawed-Off',
  xm1014: 'XM1014',

  m249: 'M249',
  negev: 'Negev',

  taser: 'Zeus x27',
  c4: 'C4 Explosive',

  decoy: 'Decoy Grenade',
  flashbang: 'Flashbang',
  hegrenade: 'High Explosive Grenade',
  // The burning area rather than the thrown grenade: a molotov kills as `inferno`, so it is the
  // molotov's own entry. Both it and the incendiary end up reading `Molotov` anyway — `weaponName`
  // takes utility to `UTILITY_NAMES`, where the two share one kind.
  inferno: 'Molotov',
  incgrenade: 'Incendiary Grenade',
  molotov: 'Molotov',
  smokegrenade: 'Smoke Grenade',
};

/**
 * The `MatchHeader.weapons` entry a kill's weapon names, or `undefined` for a weapon this
 * repository has never seen — which is also what a kill by the world (`world`, or the empty string)
 * answers, because the world holds nothing.
 *
 * Knives are matched by prefix rather than enumerated. The field carries the skin — the fixture
 * alone holds `knife_butterfly`, `knife_cord` and `knife_m9_bayonet` — and Valve adds them faster
 * than a table can be maintained, so a knife nobody here has heard of still reads as a knife.
 */
function killWeaponEntry(weapon: WeaponId): WeaponId | undefined {
  if (weapon.startsWith('knife') || weapon === 'bayonet') return 'Knife';

  return ENTRY_BY_INTERNAL_NAME[weapon];
}

/**
 * What a kill or a damage event was dealt with. A **separate vocabulary** from `weaponClass`, which
 * reads the display names on `MatchHeader.weapons`; calling that one with `ak47` answers `unknown`
 * for every kill in the match, which is the trap this function exists to close.
 *
 * A weapon the bridge has never heard of, and a kill by the world, both answer `unknown` and are
 * drawn as an absence rather than as a placeholder.
 */
export function killWeaponClass(weapon: WeaponId): WeaponClass {
  const entry = killWeaponEntry(weapon);

  return entry === undefined ? 'unknown' : weaponClass(entry);
}

/**
 * The icon that names what a kill was dealt with. It needs no table of its own: Valve's icon files
 * are named in this same internal vocabulary, so the id a kill wants **is** the weapon's own name,
 * and every knife skin collapses onto the one knife for `killWeaponClass`'s reason.
 *
 * A kill by the world, a kill by utility and a weapon nobody has drawn all answer `undefined` and
 * fall back to their class.
 */
export function killWeaponIcon(weapon: WeaponId): WeaponIconId | undefined {
  if (weapon.startsWith('knife') || weapon === 'bayonet') return 'knife';

  return isWeaponIconId(weapon) ? weapon : undefined;
}

// Derived from the names rather than restated, so the enumeration lives in one file: this half
// asks the utility half what utility is, and a new kind cannot be added to one list and not the
// other.
const UTILITY_KINDS = new Set<string>(Object.keys(UTILITY_NAMES));

/** Whether a class is a piece of utility, which is drawn by its own mark rather than a silhouette. */
export function isUtilityKind(weapon: WeaponClass): weapon is UtilityKind {
  return UTILITY_KINDS.has(weapon);
}

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

/**
 * What to call the weapon a kill was dealt with — the same name a team row shows for the same
 * object, because it *is* that name: the bridge resolves the kill's internal identifier to its
 * `MatchHeader.weapons` entry and `weaponName` answers for it, so utility defers to `UTILITY_NAMES`
 * here for the reason it does there (#152) and a knife reads `Knife` whatever skin it carried.
 *
 * A weapon the bridge has never seen **names itself**. That is upstream's identifier reaching a
 * sentence, which is the defect this closes — but a name nobody can say beats a row that says
 * nothing, and it is the same fallback `killWeaponClass` makes when it answers `unknown`.
 */
export function killWeaponName(weapon: WeaponId): string {
  const entry = killWeaponEntry(weapon);

  return entry === undefined ? weapon : weaponName(entry);
}
