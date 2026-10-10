import { MAP_IDS } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { mapCards, mapTitle, relativeTime } from '../helpers/overview';

describe('mapCards', () => {
  it('lists every radar map, busiest first, bare ones last', () => {
    const cards = mapCards([
      { map: 'de_nuke', lineups: 2, collections: 0, tactics: 0 },
      { map: 'de_mirage', lineups: 9, collections: 1, tactics: 1 },
      { map: 'de_dust2', lineups: 0, collections: 0, tactics: 1 },
    ]);
    expect(cards).toHaveLength(MAP_IDS.length);
    expect(cards.slice(0, 3).map(({ map }) => map)).toEqual(['de_mirage', 'de_nuke', 'de_dust2']);
    expect(cards.slice(0, 3).some(({ isEmpty }) => isEmpty)).toBe(false);
    expect(cards.slice(3).every(({ isEmpty }) => isEmpty)).toBe(true);
    expect(cards[0]?.image).toMatch(/^radar\/.+\.png$/);
  });
});

describe('relativeTime', () => {
  const now = Date.UTC(2026, 9, 10, 12);
  it('speaks in the largest whole unit, then in dates', () => {
    expect(relativeTime(now - 5_000, now, 'en')).toBe('now');
    expect(relativeTime(now - 3 * 60_000, now, 'en')).toBe('3 minutes ago');
    expect(relativeTime(now - 2 * 3_600_000, now, 'en')).toBe('2 hours ago');
    expect(relativeTime(now - 86_400_000, now, 'en')).toBe('yesterday');
    expect(relativeTime(now - 5 * 86_400_000, now, 'en')).toBe('5 days ago');
    expect(relativeTime(now - 30 * 86_400_000, now, 'en')).toMatch(/2026/);
  });
  it('follows the locale', () => {
    expect(relativeTime(now - 3 * 60_000, now, 'ru')).toBe('3 минуты назад');
  });
});

describe('mapTitle', () => {
  it('names a map the way the app does', () => {
    expect(mapTitle('de_mirage')).toBe('Mirage');
    expect(mapTitle('de_dust2')).toBe('Dust II');
  });
});
