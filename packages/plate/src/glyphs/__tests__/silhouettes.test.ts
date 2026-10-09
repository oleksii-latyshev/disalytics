import type { WeaponClass } from '@disa/demo-core';
import { isUtilityKind } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { SILHOUETTE_HEIGHT, SILHOUETTE_PATHS, SILHOUETTE_WIDTH } from '../helpers/silhouettes';

/**
 * Every class `weaponClass` can answer. Written out rather than derived, so adding one to
 * `demo-core` fails here instead of drawing nothing on a plate — which is a silence, not an error.
 */
const EVERY_CLASS: readonly WeaponClass[] = [
  'pistol',
  'smg',
  'rifle',
  'sniper',
  'shotgun',
  'machinegun',
  'knife',
  'zeus',
  'bomb',
  'unknown',
  'he',
  'flash',
  'smoke',
  'fire',
  'decoy',
  'kit',
];

describe('SILHOUETTE_PATHS', () => {
  it('draws every weapon class that is neither utility nor the bomb', () => {
    for (const weapon of EVERY_CLASS) {
      if (weapon === 'bomb' || isUtilityKind(weapon)) continue;

      expect(SILHOUETTE_PATHS, `no silhouette for ${weapon}`).toHaveProperty(weapon);
      expect(SILHOUETTE_PATHS[weapon].length, `${weapon} is an empty shape`).toBeGreaterThan(0);
    }
  });

  it('names nothing utility draws its own mark for, and nothing for the bomb', () => {
    const named = new Set(Object.keys(SILHOUETTE_PATHS));

    expect(named.has('bomb'), 'the bomb is a rendering rule, not a shape — §6.4').toBe(false);
    for (const weapon of EVERY_CLASS) {
      if (!isUtilityKind(weapon)) continue;
      expect(named.has(weapon), `${weapon} is drawn by Valve's own equipment icon`).toBe(false);
    }
  });

  it('keeps the box 2:1, which is what the plate mark scales from', () => {
    expect(SILHOUETTE_WIDTH / SILHOUETTE_HEIGHT).toBe(2);
  });
});
