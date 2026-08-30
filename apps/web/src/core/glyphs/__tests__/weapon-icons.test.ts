import { WEAPON_ICON_IDS } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { WEAPON_ICONS } from '../generated/weapon-icons';

describe('WEAPON_ICONS', () => {
  it('draws every weapon demo-core can name an icon for', () => {
    for (const id of WEAPON_ICON_IDS) {
      const icon = WEAPON_ICONS[id];

      expect(icon.d, `${id} is an empty outline`).toMatch(/^M.+Z$/);
      expect(icon.width, `${id} has no box`).toBeGreaterThan(0);
      expect(icon.height, `${id} has no box`).toBeGreaterThan(0);
    }
  });

  /**
   * The whole point of the set: a reader looking at a feed row asks *which rifle*, and a table that
   * answered one shape for two weapons would be the class silhouettes again under another name.
   */
  it('gives every weapon a shape nobody else has', () => {
    const seen = new Map<string, string>();

    for (const id of WEAPON_ICON_IDS) {
      const owner = seen.get(WEAPON_ICONS[id].d);

      expect(owner, `${id} and ${owner} draw the same outline`).toBeUndefined();
      seen.set(WEAPON_ICONS[id].d, id);
    }
  });

  it('is wider than it is tall wherever the weapon is', () => {
    for (const id of WEAPON_ICON_IDS) {
      const { width, height } = WEAPON_ICONS[id];

      expect(width / height, `${id} is drawn upright`).toBeGreaterThan(1);
    }
  });
});
