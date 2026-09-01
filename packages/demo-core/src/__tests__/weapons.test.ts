import { describe, expect, it } from 'vitest';
import { UTILITY_NAMES } from '../helpers/utility';
import { isWeaponIconId, WEAPON_ICON_IDS } from '../helpers/weapon-icons';
import {
  isUtilityKind,
  killWeaponClass,
  killWeaponIcon,
  killWeaponName,
  weaponClass,
  weaponClasses,
  weaponIcon,
  weaponIcons,
  weaponName,
} from '../helpers/weapons';
import { WEAPON_NONE } from '../schema';

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

describe('killWeaponName', () => {
  it('states a gun in the words a team row uses for the same gun', () => {
    expect(killWeaponName('ak47')).toBe('AK-47');
    expect(killWeaponName('m4a1')).toBe('M4A4');
    expect(killWeaponName('m4a1_silencer')).toBe('M4A1-S');
    expect(killWeaponName('usp_silencer')).toBe('USP-S');
    expect(killWeaponName('hkp2000')).toBe('P2000');
    expect(killWeaponName('taser')).toBe('Zeus x27');
  });

  it('gives utility the name the marks beside a team row give it', () => {
    expect(killWeaponName('hegrenade')).toBe(UTILITY_NAMES.he);
    expect(killWeaponName('flashbang')).toBe(UTILITY_NAMES.flash);
    expect(killWeaponName('smokegrenade')).toBe(UTILITY_NAMES.smoke);
    expect(killWeaponName('decoy')).toBe(UTILITY_NAMES.decoy);
  });

  it('reads the burning area, the molotov and the incendiary as one thing', () => {
    expect(killWeaponName('inferno')).toBe(UTILITY_NAMES.fire);
    expect(killWeaponName('molotov')).toBe(UTILITY_NAMES.fire);
    expect(killWeaponName('incgrenade')).toBe(UTILITY_NAMES.fire);
  });

  it('collapses every knife skin onto the one entry the weapon table holds', () => {
    expect(killWeaponName('knife')).toBe('Knife');
    expect(killWeaponName('knife_butterfly')).toBe('Knife');
    expect(killWeaponName('bayonet')).toBe('Knife');
  });

  it('names the bomb, which the plate draws as nothing but a sentence still states', () => {
    expect(killWeaponName('c4')).toBe('C4 Explosive');
  });

  it('lets a weapon nobody enumerated name itself rather than vanish', () => {
    expect(killWeaponName('portalgun')).toBe('portalgun');
  });

  it('resolves every weapon the product draws, and to the class it drew it as', () => {
    // The bridge and the icon set are two enumerations of the same internal vocabulary, so an id in
    // one and not the other is an identifier reaching a sentence — which is the whole defect.
    for (const icon of WEAPON_ICON_IDS) {
      const name = killWeaponName(icon);

      expect(name).not.toBe(icon);
      expect(weaponClass(name)).toBe(killWeaponClass(icon));
    }
  });
});

describe('weaponIcon', () => {
  it('tells the two M4s apart, which is what a class cannot do', () => {
    expect(weaponIcon('M4A4')).toBe('m4a1');
    expect(weaponIcon('M4A1-S')).toBe('m4a1_silencer');
    expect(weaponIcon('AK-47')).toBe('ak47');
    expect(weaponIcon('AWP')).toBe('awp');
  });

  it('names an icon for every weapon that is not utility or the bomb', () => {
    for (const weapon of ['CZ75-Auto', 'PP-Bizon', 'Galil AR', 'SSG 08', 'Nova', 'Negev']) {
      expect(weaponIcon(weapon), `${weapon} has no icon`).toBeDefined();
    }
  });

  it('leaves utility and the bomb to the marks that draw them', () => {
    expect(weaponIcon('Smoke Grenade')).toBeUndefined();
    expect(weaponIcon('Molotov')).toBeUndefined();
    expect(weaponIcon('C4 Explosive')).toBeUndefined();
  });

  it('has nothing to draw for a weapon it has never seen', () => {
    expect(weaponIcon('Plasma Rifle')).toBeUndefined();
  });
});

describe('weaponIcons', () => {
  it("answers in the order the match's own table is indexed", () => {
    expect(weaponIcons(['AK-47', 'C4 Explosive', 'Smoke Grenade', 'AWP'])).toEqual([
      'ak47',
      undefined,
      undefined,
      'awp',
    ]);
  });

  it('lines up with the classes beside it, which is what a mark falls back to', () => {
    const weapons = ['AK-47', 'Portal Gun', 'Flashbang'];

    expect(weaponIcons(weapons).length).toBe(weaponClasses(weapons).length);
  });

  it('falls off the end of the table for a slot no sample saw holding anything', () => {
    expect(weaponIcons(['AK-47'])[WEAPON_NONE]).toBeUndefined();
  });
});

describe('killWeaponIcon', () => {
  it('reads the kill vocabulary, which is where the icon files take their names', () => {
    expect(killWeaponIcon('ak47')).toBe('ak47');
    expect(killWeaponIcon('m4a1')).toBe('m4a1');
    expect(killWeaponIcon('m4a1_silencer')).toBe('m4a1_silencer');
    expect(killWeaponIcon('usp_silencer')).toBe('usp_silencer');
  });

  it('collapses every knife skin onto the one knife', () => {
    expect(killWeaponIcon('knife')).toBe('knife');
    expect(killWeaponIcon('knife_butterfly')).toBe('knife');
    expect(killWeaponIcon('bayonet')).toBe('knife');
  });

  it('has nothing to draw for the world, for utility or for the bomb', () => {
    expect(killWeaponIcon('world')).toBeUndefined();
    expect(killWeaponIcon('inferno')).toBeUndefined();
    expect(killWeaponIcon('hegrenade')).toBeUndefined();
    expect(killWeaponIcon('c4')).toBeUndefined();
  });

  it('refuses the display vocabulary, the way killWeaponClass does', () => {
    expect(killWeaponIcon('AK-47')).toBeUndefined();
  });
});

describe('WEAPON_ICON_IDS', () => {
  it('is what isWeaponIconId answers for', () => {
    for (const id of WEAPON_ICON_IDS) expect(isWeaponIconId(id)).toBe(true);

    expect(isWeaponIconId('flashbang')).toBe(false);
  });
});
