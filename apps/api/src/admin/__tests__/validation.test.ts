import { isOnRadar, lineupProblems, MAX_TITLE_LENGTH } from '@disa/admin-contract';
import { looseLineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { lineup } from './support';

const codes = (value: unknown, map = 'de_mirage') =>
  lineupProblems(value, map).map(({ code }) => code);

describe('lineupProblems', () => {
  it('finds nothing wrong with a good lineup', () => {
    expect(lineupProblems(lineup(), 'de_mirage')).toEqual([]);
  });

  it('flags a blank and an overlong title', () => {
    expect(codes(lineup({ title: '  ' }))).toEqual(['title_blank']);
    expect(codes(lineup({ title: 'x'.repeat(MAX_TITLE_LENGTH + 1) }))).toEqual(['title_too_long']);
    expect(codes(lineup({ title: 'x'.repeat(MAX_TITLE_LENGTH) }))).toEqual([]);
  });

  it('flags each point that is off the radar, and only that one', () => {
    expect(codes(lineup({ origin: { x: 90_000, y: 0, z: 0 } }))).toEqual(['origin_off_map']);
    expect(codes(lineup({ landing: { x: 0, y: -90_000, z: 0 } }))).toEqual(['landing_off_map']);
    expect(
      codes(lineup({ origin: { x: 90_000, y: 0, z: 0 }, landing: { x: 0, y: 90_000, z: 0 } })),
    ).toEqual(['origin_off_map', 'landing_off_map']);
  });

  it('says which photo is not https, and lets local refs through', () => {
    const photos = [
      `local:${'a'.repeat(64)}`,
      'http://x.example/a.webp',
      'https://x.example/b.webp',
    ];
    expect(lineupProblems(lineup({ imageUrls: photos }), 'de_mirage')).toEqual([
      { code: 'photo_not_https', index: 1 },
    ]);
  });

  it('flags another map and a body that is not a lineup', () => {
    expect(codes(lineup({ map: 'de_dust2' }))).toEqual(['wrong_map']);
    expect(codes({ id: 'x' })).toEqual(['invalid_lineup']);
    expect(codes(null)).toEqual(['invalid_lineup']);
  });

  it('cannot judge points on a map it has no radar for, and does not refuse them', () => {
    expect(
      codes(lineup({ map: 'de_workshop', origin: { x: 1e9, y: 0, z: 0 } }), 'de_workshop'),
    ).toEqual([]);
  });

  it('folds a legacy group before judging', () => {
    expect(codes(lineup({ groupId: 'g', groupTarget: 'origin' }))).toEqual([]);
  });
});

describe('isOnRadar', () => {
  it('includes the edges of the image', () => {
    // de_mirage: posX -3230, posY 1713, scale 5.
    expect(isOnRadar('de_mirage', { x: -3230, y: 1713, z: 0 })).toBe(true);
    expect(isOnRadar('de_mirage', { x: -3230 + 1024 * 5, y: 1713 - 1024 * 5, z: 0 })).toBe(true);
    expect(isOnRadar('de_mirage', { x: -3231, y: 1713, z: 0 })).toBe(false);
  });
});

describe('looseLineup', () => {
  it('accepts a blank title, nothing else', () => {
    expect(looseLineup(lineup({ title: '' }))?.title).toBe('');
    expect(looseLineup({ ...lineup({ title: '' }), kind: 'laser' })).toBeNull();
    expect(looseLineup({ ...lineup(), title: 7 })).toBeNull();
  });
});
