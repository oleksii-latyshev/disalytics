import { emptyWeaponObservations } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { EMPTY_SESSION, parseSession } from '../helpers/economy-session';

const validRound = {
  ourSide: 'CT',
  weWon: true,
  reason: 'elimination',
  enemySurvivors: 0,
  enemyKills: null,
  bombPlanted: null,
  weapons: { ...emptyWeaponObservations(), ak47: 2 },
};

function session(overrides: Record<string, unknown>): string {
  return JSON.stringify({ openingSide: 'T', rounds: [validRound], ...overrides });
}

describe('parseSession', () => {
  it('returns the empty session when nothing is saved', () => {
    expect(parseSession(null)).toBe(EMPTY_SESSION);
  });

  it('returns the empty session for malformed JSON', () => {
    expect(parseSession('{')).toBe(EMPTY_SESSION);
  });

  it('restores a valid session and numbers the rounds from one', () => {
    const restored = parseSession(session({ rounds: [validRound, validRound] }));
    expect(restored.openingSide).toBe('T');
    expect(restored.rounds.map((round) => round.id)).toEqual([1, 2]);
    expect(restored.rounds[0]?.weapons.ak47).toBe(2);
  });

  it('rejects an unknown opening side', () => {
    expect(parseSession(session({ openingSide: 'X' }))).toBe(EMPTY_SESSION);
  });

  it('rejects more than 256 rounds', () => {
    const rounds = Array.from({ length: 257 }, () => validRound);
    expect(parseSession(session({ rounds }))).toBe(EMPTY_SESSION);
  });

  it('rejects a session when any round is invalid', () => {
    const bad = { ...validRound, reason: 'surrender' };
    expect(parseSession(session({ rounds: [validRound, bad] }))).toBe(EMPTY_SESSION);
  });

  it('rejects a weapon count above five', () => {
    const weapons = { ...emptyWeaponObservations(), ak47: 6 };
    expect(parseSession(session({ rounds: [{ ...validRound, weapons }] }))).toBe(EMPTY_SESSION);
  });

  it('rejects more than five weapons in total', () => {
    const weapons = { ...emptyWeaponObservations(), ak47: 3, awp: 3 };
    expect(parseSession(session({ rounds: [{ ...validRound, weapons }] }))).toBe(EMPTY_SESSION);
  });

  it('accepts unknown survivors, kills and plant as null', () => {
    const round = { ...validRound, enemySurvivors: null, enemyKills: null, bombPlanted: null };
    expect(parseSession(session({ rounds: [round] })).rounds).toHaveLength(1);
  });

  it('rejects a non-integer survivor count', () => {
    const round = { ...validRound, enemySurvivors: 1.5 };
    expect(parseSession(session({ rounds: [round] }))).toBe(EMPTY_SESSION);
  });
});
