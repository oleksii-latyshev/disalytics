import { describe, expect, it } from 'vitest';
import { clearPick, NO_PICK, pickTarget } from '../helpers/lineup-pick';

describe('clearPick', () => {
  it('clears a picked target, its variant and an open stack', () => {
    const picked = { selectedId: 'a', variantId: 'v2', openStack: 'b' };

    expect(clearPick(picked)).toBe(NO_PICK);
  });

  it('clears a stack opened with nothing picked', () => {
    expect(clearPick({ ...NO_PICK, openStack: 'b' })).toEqual(NO_PICK);
  });

  it('keeps the same object when nothing is picked, so no render follows', () => {
    expect(clearPick(NO_PICK)).toBe(NO_PICK);
  });
});

describe('pickTarget', () => {
  it('picks straight over another pick and closes the stack', () => {
    expect(pickTarget('c')).toEqual({ selectedId: 'c', variantId: null, openStack: null });
  });
});
