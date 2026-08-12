import { describe, expect, it } from 'vitest';
import { isUtilityKind, utilityHeld, weaponClass } from '../helpers/weapons';
import {
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
} from '../schema';

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
