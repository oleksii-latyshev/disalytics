import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { captionsOf, mediaLinkOf, photosOf } from '../helpers/lineup-photos';

const lineup = (patch: Partial<Lineup> = {}): Lineup => ({
  id: 'a',
  title: 'a',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 0, y: 0, z: 0 },
  landing: { x: 1, y: 1, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'jump',
  movementKeys: [],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  ...patch,
});

describe('photosOf', () => {
  it('lists the lineup photos once each, in order', () => {
    expect(
      photosOf(lineup({ imageUrls: ['https://a/1.png', 'https://a/2.png', 'https://a/1.png'] })),
    ).toEqual(['https://a/1.png', 'https://a/2.png']);
  });

  it('falls back to a guide link that is a picture, and not to one that is a page', () => {
    expect(photosOf(lineup({ mediaUrl: 'https://a/shot.webp?x=1' }))).toEqual([
      'https://a/shot.webp?x=1',
    ]);
    expect(photosOf(lineup({ mediaUrl: 'https://a/guide' }))).toEqual([]);
    expect(photosOf(lineup())).toEqual([]);
  });

  it('refuses a guide link that is not a web link', () => {
    expect(mediaLinkOf(lineup({ mediaUrl: 'javascript:alert(1)' }))).toBeNull();
    expect(mediaLinkOf(lineup({ mediaUrl: 'https://a/guide' }))).toBe('https://a/guide');
  });
});

describe('captionsOf', () => {
  it('gives each photo its caption and an empty one where there is none', () => {
    expect(
      captionsOf(
        lineup({ imageUrls: ['https://a/1.png', 'https://a/2.png'], imageCaptions: ['Stand', ''] }),
      ),
    ).toEqual(['Stand', '']);
    expect(captionsOf(lineup({ mediaUrl: 'https://a/shot.png' }))).toEqual(['']);
  });
});
