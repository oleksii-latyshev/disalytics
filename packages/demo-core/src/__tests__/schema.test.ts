import { describe, expect, it } from 'vitest';
import {
  ANGLE_SCALE,
  BOMB_SITES,
  BUY_TYPES,
  FLAG_ALIVE,
  FLAG_DEFUSING,
  FLAG_DUCKING,
  FLAG_PLANTING,
  FLAG_SCOPED,
  FLAG_WALKING,
  GRENADE_TYPES,
  HIT_GROUPS,
  ROUND_WIN_REASONS,
  SCHEMA_VERSION,
  TEAMS,
} from '../schema';

const INT16_MIN = -32_768;
const INT16_MAX = 32_767;

const VOCABULARIES = {
  TEAMS,
  GRENADE_TYPES,
  HIT_GROUPS,
  ROUND_WIN_REASONS,
  BOMB_SITES,
  BUY_TYPES,
};

describe('SCHEMA_VERSION', () => {
  it('is a positive integer, so a cache key built from it is stable text', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
    expect(SCHEMA_VERSION).toBeGreaterThan(0);
  });
});

describe('game vocabulary', () => {
  for (const [name, values] of Object.entries(VOCABULARIES)) {
    it(`${name} holds distinct, non-empty identifiers`, () => {
      expect(new Set(values).size).toBe(values.length);
      expect(values.every((value) => value.length > 0)).toBe(true);
    });
  }
});

describe('the flags bitfield', () => {
  const flags = [FLAG_ALIVE, FLAG_DUCKING, FLAG_SCOPED, FLAG_DEFUSING, FLAG_PLANTING, FLAG_WALKING];

  it('gives every state its own bit', () => {
    expect(new Set(flags).size).toBe(flags.length);
    expect(flags.every((flag) => Number.isInteger(Math.log2(flag)))).toBe(true);
  });

  it('fits the Uint8Array it is stored in', () => {
    expect(flags.reduce((all, flag) => all | flag, 0)).toBeLessThanOrEqual(255);
  });
});

describe('the view-angle encoding', () => {
  it('keeps the engine ranges inside Int16', () => {
    expect(180 * ANGLE_SCALE).toBeLessThanOrEqual(INT16_MAX);
    expect(-180 * ANGLE_SCALE).toBeGreaterThanOrEqual(INT16_MIN);
    expect(90 * ANGLE_SCALE).toBeLessThanOrEqual(INT16_MAX);
  });
});
