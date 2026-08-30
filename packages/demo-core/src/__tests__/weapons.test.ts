import { describe, expect, it } from 'vitest';
import {
  isUtilityKind,
  killWeaponClass,
  UTILITY_NAMES,
  utilityHeld,
  utilityKindOfGrenade,
  weaponClass,
  weaponClasses,
  weaponName,
} from '../helpers/weapons';
import {
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
  GRENADE_TYPES,
  WEAPON_NONE,
} from '../schema';

describe('utilityKindOfGrenade', () => {
  it('names the kind a thrown grenade is drawn as', () => {
    expect(utilityKindOfGrenade('hegrenade')).toBe('he');
    expect(utilityKindOfGrenade('flashbang')).toBe('flash');
    expect(utilityKindOfGrenade('smokegrenade')).toBe('smoke');
    expect(utilityKindOfGrenade('decoy')).toBe('decoy');
  });

  it('answers the same kind for a molotov and an incendiary', () => {
    expect(utilityKindOfGrenade('molotov')).toBe('fire');
    expect(utilityKindOfGrenade('incgrenade')).toBe('fire');
  });

  it('has a kind for every grenade the schema carries', () => {
    for (const type of GRENADE_TYPES) expect(utilityKindOfGrenade(type)).toBeDefined();
  });
});

describe('weaponClass', () => {
  it('classifies the vocabulary a real match carried', () => {
    // The 28 entries `MatchHeader.weapons` held on the fixture demo, which is the only evidence
    // this table has for what upstream's display names actually look like.
    expect(weaponClass('AK-47')).toBe('rifle');
    expect(weaponClass('M4A1-S')).toBe('rifle');
    expect(weaponClass('M4A4')).toBe('rifle');
    expect(weaponClass('AWP')).toBe('sniper');
    expect(weaponClass('SSG 08')).toBe('sniper');
    expect(weaponClass('Desert Eagle')).toBe('pistol');
    expect(weaponClass('Dual Berettas')).toBe('pistol');
    expect(weaponClass('MAC-10')).toBe('smg');
    expect(weaponClass('MAG-7')).toBe('shotgun');
    expect(weaponClass('XM1014')).toBe('shotgun');
    expect(weaponClass('Knife')).toBe('knife');
  });

  it('answers `fire` for both molotov and incendiary', () => {
    expect(weaponClass('Molotov')).toBe('fire');
    expect(weaponClass('Incendiary Grenade')).toBe('fire');
  });

  it('resolves held utility to its own kind rather than to one grenade class', () => {
    expect(weaponClass('High Explosive Grenade')).toBe('he');
    expect(weaponClass('Flashbang')).toBe('flash');
    expect(weaponClass('Smoke Grenade')).toBe('smoke');
    expect(weaponClass('Decoy Grenade')).toBe('decoy');
  });

  it('gives the bomb its own class, which is what the rendering rule matches on', () => {
    expect(weaponClass('C4 Explosive')).toBe('bomb');
  });

  it('falls back rather than failing on a weapon nobody enumerated', () => {
    expect(weaponClass('Portal Gun')).toBe('unknown');
    expect(weaponClass('')).toBe('unknown');
  });
});

describe('weaponClasses', () => {
  it('answers class for class, in the order the table indexes them', () => {
    expect(weaponClasses(['AK-47', 'C4 Explosive', 'AWP', 'Knife'])).toEqual([
      'rifle',
      'bomb',
      'sniper',
      'knife',
    ]);
  });

  it('holds a place for a weapon it has never heard of rather than dropping it', () => {
    expect(weaponClasses(['Portal Gun', 'AWP'])).toEqual(['unknown', 'sniper']);
  });

  it('has nothing at WEAPON_NONE, which is not the same answer as `unknown`', () => {
    expect(weaponClasses(['AK-47'])[WEAPON_NONE]).toBeUndefined();
  });
});

describe('killWeaponClass', () => {
  it('reads the internal vocabulary the fixture demo actually carried', () => {
    // Every weapon string the golden snapshot holds on a `weapon` field, which is the only evidence
    // this table has for what `Kill.weapon` looks like.
    expect(killWeaponClass('ak47')).toBe('rifle');
    expect(killWeaponClass('m4a1')).toBe('rifle');
    expect(killWeaponClass('m4a1_silencer')).toBe('rifle');
    expect(killWeaponClass('awp')).toBe('sniper');
    expect(killWeaponClass('inferno')).toBe('fire');
  });

  it('is a different vocabulary from `weaponClass`, and neither answers the other', () => {
    expect(weaponClass('ak47')).toBe('unknown');
    expect(killWeaponClass('AK-47')).toBe('unknown');
  });

  it('reads a knife through its skin, which is what the field carries', () => {
    expect(killWeaponClass('knife')).toBe('knife');
    expect(killWeaponClass('knife_butterfly')).toBe('knife');
    expect(killWeaponClass('knife_cord')).toBe('knife');
    expect(killWeaponClass('knife_m9_bayonet')).toBe('knife');
    expect(killWeaponClass('bayonet')).toBe('knife');
  });

  it('reads a knife skin nobody enumerated, because Valve keeps adding them', () => {
    expect(killWeaponClass('knife_kukri')).toBe('knife');
  });

  it('answers `fire` for a molotov, an incendiary and the area they leave', () => {
    expect(killWeaponClass('molotov')).toBe('fire');
    expect(killWeaponClass('incgrenade')).toBe('fire');
    expect(killWeaponClass('inferno')).toBe('fire');
  });

  it('resolves thrown utility to its own kind', () => {
    expect(killWeaponClass('hegrenade')).toBe('he');
    expect(killWeaponClass('flashbang')).toBe('flash');
    expect(killWeaponClass('smokegrenade')).toBe('smoke');
    expect(killWeaponClass('decoy')).toBe('decoy');
  });

  it('gives the bomb its own class, which is what the rendering rule matches on', () => {
    expect(killWeaponClass('c4')).toBe('bomb');
  });

  it('answers `unknown` for a kill the world dealt', () => {
    expect(killWeaponClass('world')).toBe('unknown');
    expect(killWeaponClass('')).toBe('unknown');
  });

  it('falls back rather than failing on a weapon nobody enumerated', () => {
    expect(killWeaponClass('portalgun')).toBe('unknown');
  });
});

describe('isUtilityKind', () => {
  it('separates what draws a utility mark from what draws a silhouette', () => {
    expect(isUtilityKind('flash')).toBe(true);
    expect(isUtilityKind('kit')).toBe(true);
    expect(isUtilityKind('rifle')).toBe(false);
    expect(isUtilityKind('bomb')).toBe(false);
    expect(isUtilityKind('unknown')).toBe(false);
  });
});

describe('utilityHeld', () => {
  const kindsOf = (grenades: number) => utilityHeld(grenades).map((held) => held.kind);

  it('identifies each mark by the bit it came from, so two flashbangs are two items', () => {
    expect(utilityHeld(GRENADE_FLASH | GRENADE_FLASH_SECOND).map((held) => held.bit)).toEqual([
      GRENADE_FLASH,
      GRENADE_FLASH_SECOND,
    ]);
  });

  it('reads nothing out of an empty bitfield', () => {
    expect(kindsOf(0)).toEqual([]);
  });

  it('draws two flashbangs as two marks rather than one counted mark', () => {
    expect(kindsOf(GRENADE_FLASH | GRENADE_FLASH_SECOND)).toEqual(['flash', 'flash']);
  });

  it('keeps the drawing order regardless of the order the bits are set in', () => {
    const full =
      GRENADE_DEFUSE_KIT |
      GRENADE_DECOY |
      GRENADE_FIRE |
      GRENADE_SMOKE |
      GRENADE_FLASH |
      GRENADE_HE;

    expect(kindsOf(full)).toEqual(['he', 'flash', 'smoke', 'fire', 'decoy', 'kit']);
  });

  it('ignores a bit no kind is named for', () => {
    expect(kindsOf(1 << 7)).toEqual([]);
  });
});

describe('weaponName', () => {
  // The six entries of `MatchHeader.weapons` that name utility, which are the only ones a team row
  // can state twice: the same object is also a bit of the `grenades` bitfield beside them.
  const UTILITY_ENTRIES = [
    'High Explosive Grenade',
    'Flashbang',
    'Smoke Grenade',
    'Molotov',
    'Incendiary Grenade',
    'Decoy Grenade',
  ];

  it('names a held grenade the way the marks beside it name the same grenade', () => {
    expect(weaponName('High Explosive Grenade')).toBe(UTILITY_NAMES.he);
    expect(weaponName('Flashbang')).toBe(UTILITY_NAMES.flash);
    expect(weaponName('Smoke Grenade')).toBe(UTILITY_NAMES.smoke);
    expect(weaponName('Decoy Grenade')).toBe(UTILITY_NAMES.decoy);
  });

  it('gives a molotov and an incendiary one name, since the bitfield cannot tell them apart', () => {
    expect(weaponName('Molotov')).toBe(UTILITY_NAMES.fire);
    expect(weaponName('Incendiary Grenade')).toBe(UTILITY_NAMES.fire);
  });

  it('answers a name out of the utility vocabulary for every entry that is utility', () => {
    const vocabulary = new Set<string>(Object.values(UTILITY_NAMES));

    for (const entry of UTILITY_ENTRIES) expect(vocabulary.has(weaponName(entry))).toBe(true);
  });

  it('leaves everything that is not utility the display name the match carried', () => {
    expect(weaponName('AK-47')).toBe('AK-47');
    expect(weaponName('Zeus x27')).toBe('Zeus x27');
    expect(weaponName('Knife')).toBe('Knife');
    expect(weaponName('C4 Explosive')).toBe('C4 Explosive');
  });

  it('names a weapon this table has never heard of, rather than dropping it', () => {
    expect(weaponName('Plasma Rifle')).toBe('Plasma Rifle');
  });
});

describe('UTILITY_NAMES', () => {
  it('names every kind a bitfield can hold, the defuse kit included', () => {
    const full =
      GRENADE_HE |
      GRENADE_FLASH |
      GRENADE_FLASH_SECOND |
      GRENADE_SMOKE |
      GRENADE_FIRE |
      GRENADE_DECOY |
      GRENADE_DEFUSE_KIT;

    for (const held of utilityHeld(full)) expect(UTILITY_NAMES[held.kind]).toBeTruthy();
  });

  it('keeps a name for the defuse kit, which no weapon-table entry can give one', () => {
    expect(weaponClass(UTILITY_NAMES.kit)).toBe('unknown');
    expect(UTILITY_NAMES.kit).toBe('Defuse Kit');
  });
});
