import { describe, expect, it } from 'vitest';
import { oppositeSide, sideAtRound } from '../helpers/round-sides';

describe('oppositeSide', () => {
  it('flips the side', () => {
    expect(oppositeSide('CT')).toBe('T');
    expect(oppositeSide('T')).toBe('CT');
  });
});

describe('sideAtRound', () => {
  it('holds the opening side through the first half', () => {
    expect(sideAtRound('CT', 1)).toBe('CT');
    expect(sideAtRound('CT', 12)).toBe('CT');
  });

  it('swaps at halftime', () => {
    expect(sideAtRound('CT', 13)).toBe('T');
    expect(sideAtRound('CT', 24)).toBe('T');
    expect(sideAtRound('T', 13)).toBe('CT');
  });

  it('swaps every three rounds in overtime', () => {
    expect(sideAtRound('CT', 25)).toBe('T');
    expect(sideAtRound('CT', 27)).toBe('T');
    expect(sideAtRound('CT', 28)).toBe('CT');
    expect(sideAtRound('CT', 30)).toBe('CT');
    expect(sideAtRound('CT', 31)).toBe('T');
    expect(sideAtRound('T', 28)).toBe('T');
    expect(sideAtRound('T', 31)).toBe('CT');
  });
});
