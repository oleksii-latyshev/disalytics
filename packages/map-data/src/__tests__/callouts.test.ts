import { describe, expect, it } from 'vitest';
import { findNearestCallout, getMapCallouts } from '../callouts';

describe('getMapCallouts', () => {
  it('returns callouts for valid maps', () => {
    const mirageCallouts = getMapCallouts('de_mirage');
    expect(mirageCallouts.length).toBeGreaterThan(10);
    expect(mirageCallouts.some((c) => c.name === 'A Site')).toBe(true);
    expect(mirageCallouts.some((c) => c.name === 'Window')).toBe(true);

    const dust2Callouts = getMapCallouts('de_dust2');
    expect(dust2Callouts.length).toBeGreaterThan(10);
    expect(dust2Callouts.some((c) => c.name === 'A Site')).toBe(true);
    expect(dust2Callouts.some((c) => c.name === 'B Site')).toBe(true);
  });

  it('returns empty array for unknown maps', () => {
    expect(getMapCallouts('workshop_custom_map')).toEqual([]);
  });
});

describe('findNearestCallout', () => {
  it('finds Window on Mirage near Snipers Nest', () => {
    // Window on Mirage is around (-1050, -350)
    const result = findNearestCallout('de_mirage', { x: -1040, y: -360 });
    expect(result).toBe('Window');
  });

  it('finds A Site or Default A on Mirage near site', () => {
    const result = findNearestCallout('de_mirage', { x: -270, y: -1640 });
    expect(result === 'A Site' || result === 'Default A').toBe(true);
  });

  it('returns null if coordinates are too far from any callout', () => {
    const result = findNearestCallout('de_mirage', { x: 5000, y: 5000 }, 200);
    expect(result).toBeNull();
  });

  it('returns null for unknown map', () => {
    expect(findNearestCallout('unknown_map', { x: 0, y: 0 })).toBeNull();
  });
});
