import type { UtilityKind } from '@disa/demo-core';

/**
 * The two armour states Counter-Strike draws, and the ids of the assets that draw them.
 *
 * They live here rather than in `@disa/demo-core` because armour is not in any demo vocabulary. A
 * weapon icon's id *is* one — `Kill.weapon` carries Counter-Strike's internal names, which is what
 * lets `WEAPON_ICON_IDS` sit in `demo-core` and hold that table to its word. Armour is
 * `TickTrack.armour` and the `FLAG_HELMET` bit read together, which is a thing the interface
 * decides, so its names belong to the interface. Hard rule 11 keeps `demo-core` free of anything
 * only a screen needs.
 */
export type EquipmentIconId =
  | 'armor'
  | 'armor_helmet'
  | 'decoy'
  | 'defuser'
  | 'flashbang'
  | 'hegrenade'
  | 'molotov'
  | 'smokegrenade';

/**
 * Each kind of utility as Counter-Strike draws it. The names on the right are Valve's own file
 * names, which are the internal vocabulary — the same one `Kill.weapon` carries — so this table is
 * a mapping between two vocabularies rather than a set of labels.
 *
 * **`fire` has one icon and not two.** The `grenades` bitfield cannot tell a Molotov from an
 * Incendiary, which is the same reason #152 gave both of them one name, and an icon that claimed
 * the distinction would be wrong for half the readings it made.
 */
export const UTILITY_ICON: Readonly<Record<UtilityKind, EquipmentIconId>> = {
  he: 'hegrenade',
  flash: 'flashbang',
  smoke: 'smokegrenade',
  fire: 'molotov',
  decoy: 'decoy',
  kit: 'defuser',
};

/**
 * Which of the two a player is wearing, or `null` for no armour at all — the same three-way answer
 * Counter-Strike's own buy menu gives, where a helmet without a vest is not a state the game has.
 */
export function armourIcon(armour: number, hasHelmet: boolean): EquipmentIconId | null {
  if (armour <= 0) return null;

  return hasHelmet ? 'armor_helmet' : 'armor';
}
