import { describe, expect, it } from 'vitest';
import { clearPick, NO_PICK, pickTarget } from '../helpers/lineup-pick';

describe('lineup pick', () => {
  it('picks a target with its first position and no stack open', () => {
    expect(pickTarget('a')).toEqual({ targetId: 'a', variantId: null, openStack: null });
  });

  it('lets go of everything, and returns the same object when there is nothing to let go of', () => {
    expect(clearPick({ targetId: 'a', variantId: 'b', openStack: 'c' })).toBe(NO_PICK);
    expect(clearPick(NO_PICK)).toBe(NO_PICK);
  });
});
