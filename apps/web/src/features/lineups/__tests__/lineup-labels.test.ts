import { describe, expect, it } from 'vitest';
import { sideLabel, targetTitle } from '../helpers/lineup-labels';

describe('lineup labels', () => {
  it('names a target by the kind players say and where it lands', () => {
    expect(targetTitle({ kind: 'fire', name: 'Window' })).toBe('Molotov · Window');
  });

  it('reads a lineup for both sides as T·CT', () => {
    expect([sideLabel('T'), sideLabel('CT'), sideLabel('BOTH')]).toEqual(['T', 'CT', 'T·CT']);
  });
});
