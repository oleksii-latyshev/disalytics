import { WEAPON_REFERENCES } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { filterWeapons, pickSelected } from '../helpers/weapon-filter';

const ALL = { query: '', category: 'all', side: 'all' } as const;

describe('filterWeapons', () => {
  it('returns everything for an empty filter', () => {
    expect(filterWeapons(WEAPON_REFERENCES, ALL)).toHaveLength(WEAPON_REFERENCES.length);
  });

  it('matches names case-insensitively and ignores surrounding space', () => {
    const names = filterWeapons(WEAPON_REFERENCES, { ...ALL, query: '  ak ' }).map((w) => w.name);
    expect(names).toContain('AK-47');
  });

  it('narrows by category', () => {
    const rifles = filterWeapons(WEAPON_REFERENCES, { ...ALL, category: 'rifle' });
    expect(rifles.length).toBeGreaterThan(0);
    expect(rifles.every((w) => w.category === 'rifle')).toBe(true);
  });

  it('keeps both-side weapons under a side filter and drops the other side', () => {
    const ct = filterWeapons(WEAPON_REFERENCES, { ...ALL, side: 'ct' });
    expect(ct.some((w) => w.name === 'AWP')).toBe(true);
    expect(ct.some((w) => w.name === 'M4A4')).toBe(true);
    expect(ct.some((w) => w.name === 'AK-47')).toBe(false);
  });
});

describe('pickSelected', () => {
  const rifles = filterWeapons(WEAPON_REFERENCES, { ...ALL, category: 'rifle' });

  it('keeps the chosen weapon while it is visible', () => {
    expect(pickSelected(rifles, 'AK-47')?.name).toBe('AK-47');
  });

  it('falls back to the first visible weapon, or null', () => {
    expect(pickSelected(rifles, 'AWP')).toBe(rifles[0]);
    expect(pickSelected([], 'AK-47')).toBeNull();
  });
});
