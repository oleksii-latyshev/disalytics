import {
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
  GRENADE_TYPES,
  type GrenadeType,
} from '../schema';

/** The utility a player can be carrying, which is what one bit of the `grenades` bitfield means. */
export type UtilityKind = 'he' | 'flash' | 'smoke' | 'fire' | 'decoy' | 'kit';

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

/**
 * The kinds that reach the map as a thrown grenade, in the order the types themselves are declared
 * in. Derived rather than restated, for `UTILITY_KINDS`' reason: a list of five written out here is
 * an enumeration living beside the one that decides it. `kit` is not among them — a defuse kit is
 * equipment and is never thrown.
 */
export const THROWN_UTILITY_KINDS: readonly UtilityKind[] = [
  ...new Set(GRENADE_TYPES.map(utilityKindOfGrenade)),
];

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
