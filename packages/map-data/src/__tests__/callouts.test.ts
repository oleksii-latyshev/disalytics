import { describe, expect, it } from 'vitest';
import { calloutAt, findNearestCallout, getMapCallouts } from '../callouts';

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

describe('calloutAt', () => {
  it('names a point inside a callout exactly', () => {
    expect(calloutAt('de_dust2', { x: -457, y: 1602 })).toEqual({
      name: 'Xbox',
      isApproximate: false,
    });
  });

  it('names Dust 2 landings the sample match lands in, instead of leaving them blank', () => {
    expect(calloutAt('de_dust2', { x: -1981, y: 1631 })).toEqual({
      name: 'Upper Tunnels',
      isApproximate: false,
    });
    expect(calloutAt('de_inferno', { x: 351, y: 2800 })).toEqual({
      name: 'B Site',
      isApproximate: false,
    });
  });

  it('falls back to the nearest callout, marked approximate, when none holds the point', () => {
    const found = calloutAt('de_dust2', { x: 1554, y: 300 });

    expect(found?.isApproximate).toBe(true);
    expect(found?.name).toBe('Pit');
  });

  it('gives up when nothing is near, and for a map it has no callouts for', () => {
    expect(calloutAt('de_dust2', { x: 9000, y: 9000 })).toBeNull();
    expect(calloutAt('unknown_map', { x: 0, y: 0 })).toBeNull();
  });
});
