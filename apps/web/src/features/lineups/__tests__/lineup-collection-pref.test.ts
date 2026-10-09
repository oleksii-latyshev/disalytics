import { describe, expect, it } from 'vitest';
import {
  readCollectionPreference,
  writeCollectionPreference,
} from '../helpers/lineup-collection-pref';

function memory() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('collection preference', () => {
  it('keeps one collection per map under a disa.* key', () => {
    const prefs = memory();
    writeCollectionPreference('de_mirage', 'c1', prefs);
    writeCollectionPreference('de_dust2', 'c2', prefs);

    expect(readCollectionPreference('de_mirage', prefs)).toBe('c1');
    expect(readCollectionPreference('de_dust2', prefs)).toBe('c2');
    expect(readCollectionPreference('de_nuke', prefs)).toBeNull();
    expect([...prefs.items.keys()].every((key) => key.startsWith('disa.'))).toBe(true);
  });

  it('forgets on null, and survives storage that throws or is absent', () => {
    const prefs = memory();
    writeCollectionPreference('de_mirage', 'c1', prefs);
    writeCollectionPreference('de_mirage', null, prefs);
    expect(readCollectionPreference('de_mirage', prefs)).toBeNull();

    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readCollectionPreference('de_mirage', broken)).toBeNull();
    expect(() => writeCollectionPreference('de_mirage', 'c1', broken)).not.toThrow();
    expect(readCollectionPreference('de_mirage', null)).toBeNull();
  });
});
