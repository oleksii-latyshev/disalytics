import { describe, expect, it } from 'vitest';
import {
  groupPhotos,
  keepSide,
  keptTiles,
  movedOrder,
  orderedTiles,
  photoKey,
  type Sizes,
  withoutPhoto,
  withTiles,
} from '../helpers/photos';
import { BASE, lineup, sha } from './support';

const site = (n: number) => `${BASE}/${sha(n)}`;
const none: Sizes = new Map();

describe('photoKey', () => {
  it('reads a local photo and our stored copy of it as one', () => {
    expect(photoKey(`local:${sha(1)}`, BASE)).toBe(photoKey(site(1), BASE));
    expect(photoKey('https://files.example/a.webp', BASE)).toBe('url:https://files.example/a.webp');
  });
});

describe('groupPhotos', () => {
  const stored = lineup({
    imageUrls: [site(1), site(2), site(3)],
    imageCaptions: ['one', '', 'three'],
  });
  const file = lineup({
    imageUrls: [
      `local:${sha(2)}`,
      'https://files.example/new-a.webp',
      'https://files.example/new-b.webp',
      'https://files.example/new-c.webp',
    ],
    imageCaptions: ['two in file', 'a', 'b', 'c'],
  });

  it('makes one tile of a photo both have, pairs the rest, and leaves extras single', () => {
    const groups = groupPhotos(stored, file, BASE);
    expect(groups.map((group) => group.kind)).toEqual(['pair', 'same', 'pair', 'single']);
    const same = groups[1];
    expect(same?.kind === 'same' && same.tile.caption).toBe('two in file');
    const last = groups[3];
    expect(last?.kind === 'single' && last.tile.from).toBe('file');
  });

  it('keeps the sharper of a pair, the site when sizes are unknown, and any override', () => {
    const groups = groupPhotos(stored, file, BASE);
    expect(keptTiles(groups, none, {}).map((tile) => tile.id)).toEqual(['s0', 's1', 's2', 'f3']);

    const sizes: Sizes = new Map([
      [site(1), { width: 1280, height: 720 }],
      ['https://files.example/new-a.webp', { width: 1920, height: 1080 }],
    ]);
    expect(keptTiles(groups, sizes, {}).map((tile) => tile.id)).toEqual(['f1', 's1', 's2', 'f3']);
    expect(
      keptTiles(groups, sizes, { s0: true, f1: false, f3: false }).map((tile) => tile.id),
    ).toEqual(['s0', 's1', 's2']);
  });

  it('keeps one side whole with keepSide', () => {
    const groups = groupPhotos(stored, file, BASE);
    const keep = keepSide(groups, 'file');
    expect(keptTiles(groups, none, keep).map((tile) => tile.id)).toEqual(['f1', 's1', 'f2', 'f3']);
    expect(keptTiles(groups, none, keepSide(groups, 'stored')).map((tile) => tile.id)).toEqual([
      's0',
      's1',
      's2',
    ]);
  });
});

describe('order and result', () => {
  it('orders by the person, the rest after', () => {
    const groups = groupPhotos(lineup({ imageUrls: [site(1), site(2)] }), lineup(), BASE);
    const kept = keptTiles(groups, none, {});
    expect(orderedTiles(kept, ['s1']).map((tile) => tile.id)).toEqual(['s1', 's0']);
    expect(movedOrder(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(movedOrder(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
  });

  it('writes urls with their captions, and none when there are no photos', () => {
    const groups = groupPhotos(
      lineup({ imageUrls: [site(1)], imageCaptions: ['hi'] }),
      lineup(),
      BASE,
    );
    const merged = withTiles(lineup(), keptTiles(groups, none, {}));
    expect(merged).toMatchObject({ imageUrls: [site(1)], imageCaptions: ['hi'] });
    expect(withTiles(lineup({ imageUrls: [site(1)] }), [])).not.toHaveProperty('imageUrls');
  });

  it('removes a photo with its caption', () => {
    const result = withoutPhoto(
      lineup({
        imageUrls: ['https://a.example/1', 'http://a.example/2'],
        imageCaptions: ['x', 'y'],
      }),
      1,
    );
    expect(result).toMatchObject({ imageUrls: ['https://a.example/1'], imageCaptions: ['x'] });
  });
});
