import { describe, expect, it } from 'vitest';
import { allPicks, defaultPicks, isEmptyField, mergeFields, sameField } from '../helpers/fields';
import { lineup } from './support';

describe('defaultPicks', () => {
  it('takes the file, except where it is empty and the site has something', () => {
    const stored = lineup({ notes: 'on the site', title: 'Old' });
    const file = lineup({ title: 'New' });
    const picks = defaultPicks(stored, file);
    expect(picks.title).toBe('file');
    expect(picks.notes).toBe('stored');
  });
});

describe('mergeFields', () => {
  const stored = lineup({
    title: 'Site',
    notes: 'site notes',
    tags: ['old'],
    imageUrls: [`${'x'}`.length ? 'https://a.example/1.webp' : ''],
  });
  const file = lineup({
    title: 'File',
    author: { name: 'Dan' },
    landing: { x: 310, y: 410, z: 0 },
  });

  it('takes each field from the side picked and the id from the site', () => {
    const picks = { ...allPicks('stored'), title: 'file' as const, landing: 'file' as const };
    const merged = mergeFields(stored, { ...file, id: 'other' }, picks);
    expect(merged).toMatchObject({
      id: 'mirage-1',
      title: 'File',
      notes: 'site notes',
      tags: ['old'],
      landing: { x: 310, y: 410, z: 0 },
    });
    expect(merged.author).toBeUndefined();
  });

  it('drops a field the picked side does not have', () => {
    const merged = mergeFields(stored, file, allPicks('file'));
    expect(merged.notes).toBeUndefined();
    expect(merged.tags).toBeUndefined();
    expect(merged.author).toEqual({ name: 'Dan' });
  });
});

describe('field comparison', () => {
  it('compares a pair of keys together and ignores key order', () => {
    expect(
      sameField(
        'origin',
        lineup({ origin: { x: 1, y: 2, z: 3 } }),
        lineup({ origin: { z: 3, y: 2, x: 1 } }),
      ),
    ).toBe(true);
    expect(sameField('aim', lineup(), lineup({ yaw: 46 }))).toBe(false);
  });

  it('knows an empty field', () => {
    expect(isEmptyField('notes', lineup({ notes: '  ' }))).toBe(true);
    expect(isEmptyField('tags', lineup({ tags: [] }))).toBe(true);
    expect(isEmptyField('title', lineup())).toBe(false);
  });
});
