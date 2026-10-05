import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { heldKeys, spokenButtons, standLabel } from '../helpers/lineup-how';

const lineup = (patch: Partial<Lineup> = {}): Lineup => ({
  id: 'a',
  title: 'Smoke kitchen from B-apps',
  map: 'de_mirage',
  side: 'T',
  kind: 'smoke',
  origin: { x: 1e7, y: 1e7, z: 0 },
  landing: { x: 0, y: 0, z: 0 },
  pitch: 0,
  yaw: 0,
  throwType: 'jump',
  movementKeys: ['Stand', 'Jump', 'W'],
  movementKeysSummary: '',
  command: '',
  createdAt: 1,
  ...patch,
});

describe('lineup how-to', () => {
  it('says where to stand by the lineup own name where no callout is near', () => {
    expect(standLabel('de_mirage', lineup())).toBe('Smoke kitchen from B-apps');
  });

  it('holds the keys a throw needs and not the absence of keys', () => {
    expect(heldKeys(lineup())).toEqual(['Jump', 'W']);
  });

  it('does not say a plain left press', () => {
    expect(spokenButtons(lineup({ mouseButtons: ['left'] }))).toEqual([]);
    expect(spokenButtons(lineup())).toEqual([]);
    expect(spokenButtons(lineup({ mouseButtons: ['left', 'right'] }))).toEqual(['left', 'right']);
    expect(spokenButtons(lineup({ mouseButtons: ['right'] }))).toEqual(['right']);
  });
});
