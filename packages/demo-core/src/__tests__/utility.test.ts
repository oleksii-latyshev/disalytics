import { describe, expect, it } from 'vitest';
import { UTILITY_NAMES, utilityHeld, utilityKindOfGrenade } from '../helpers/utility';
import { weaponClass } from '../helpers/weapons';
import {
  GRENADE_DECOY,
  GRENADE_DEFUSE_KIT,
  GRENADE_FIRE,
  GRENADE_FLASH,
  GRENADE_FLASH_SECOND,
  GRENADE_HE,
  GRENADE_SMOKE,
  GRENADE_TYPES,
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
