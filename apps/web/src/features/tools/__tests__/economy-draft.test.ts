import { describe, expect, it } from 'vitest';
import { formatMoneyRange, newObservation, reasonsForWinner } from '../helpers/economy-draft';

describe('newObservation', () => {
  it('starts as a won elimination with no weapons seen', () => {
    const observation = newObservation('T');
    expect(observation.ourSide).toBe('T');
    expect(observation.weWon).toBe(true);
    expect(observation.reason).toBe('elimination');
    expect(observation.enemySurvivors).toBe(0);
    expect(Object.values(observation.weapons).every((count) => count === 0)).toBe(true);
  });
});

describe('reasonsForWinner', () => {
  it('offers the bomb explosion to the terrorists', () => {
    expect(reasonsForWinner('T')).toEqual(['elimination', 'bomb-exploded']);
  });

  it('offers the defuse and the clock to the counter-terrorists', () => {
    expect(reasonsForWinner('CT')).toEqual(['elimination', 'bomb-defused', 'time-expired']);
  });
});

describe('formatMoneyRange', () => {
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  it('collapses an exact value', () => {
    expect(formatMoneyRange(money, 2400, 2400)).toBe('$2,400');
  });

  it('rounds the ceiling to the nearest hundred', () => {
    expect(formatMoneyRange(money, 2000, 2849)).toBe('$2,000–$2,800');
  });
});
