import { ROUND_WIN_REASONS } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { roundOutcomeKey } from '../helpers/outcome-copy';

describe('roundOutcomeKey', () => {
  it('names a sentence for every reason the parser can emit', () => {
    const keys = ROUND_WIN_REASONS.map(roundOutcomeKey);

    expect(new Set(keys).size).toBe(ROUND_WIN_REASONS.length);
    expect(keys.every((key) => key.startsWith('timeline.outcome.'))).toBe(true);
  });

  it('reads the bomb apart from the elimination it looks like', () => {
    expect(roundOutcomeKey('bomb-exploded')).toBe('timeline.outcome.bombExploded');
    expect(roundOutcomeKey('bomb-defused')).toBe('timeline.outcome.bombDefused');
  });

  it('keeps the two eliminations apart', () => {
    expect(roundOutcomeKey('all-ct-eliminated')).toBe('timeline.outcome.allCtEliminated');
    expect(roundOutcomeKey('all-t-eliminated')).toBe('timeline.outcome.allTEliminated');
  });

  it('has copy for the endings that name no killer', () => {
    expect(roundOutcomeKey('time-expired')).toBe('timeline.outcome.timeExpired');
    expect(roundOutcomeKey('draw')).toBe('timeline.outcome.draw');
  });
});
