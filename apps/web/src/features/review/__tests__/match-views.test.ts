import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_VIEWS,
  FLAT_SEAT_LIMIT,
  MATCH_VIEWS,
  nextMatchView,
  splitSeats,
} from '../helpers/match-views';

describe('splitSeats', () => {
  const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('keeps five flat and sends the rest to the menu', () => {
    expect(splitSeats(seven)).toEqual({
      flat: ['a', 'b', 'c', 'd', 'e'],
      more: ['f', 'g'],
    });
  });

  it('opens no menu at the limit', () => {
    expect(splitSeats(seven.slice(0, FLAT_SEAT_LIMIT)).more).toEqual([]);
  });

  it('draws the shipped views flat', () => {
    expect(splitSeats(ANALYSIS_VIEWS).more).toEqual([]);
  });
});

describe('nextMatchView', () => {
  it('walks the views and wraps to the stage', () => {
    const seen = MATCH_VIEWS.map((section) => section.view);

    expect(nextMatchView('stage')).toBe(seen[1]);
    expect(nextMatchView(seen[seen.length - 1] ?? 'stage')).toBe('stage');
  });
});
