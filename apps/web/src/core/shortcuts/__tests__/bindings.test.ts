import { describe, expect, it } from 'vitest';
import { actionForKey, SHORTCUT_BINDINGS } from '../helpers/bindings';

describe('SHORTCUT_BINDINGS', () => {
  it('binds each action once', () => {
    const actions = SHORTCUT_BINDINGS.map((binding) => binding.action);

    expect(new Set(actions).size).toBe(actions.length);
  });

  it('gives no key two meanings', () => {
    const triggers = SHORTCUT_BINDINGS.flatMap((binding) => binding.triggers);

    expect(new Set(triggers).size).toBe(triggers.length);
  });

  it('prints a key for every binding', () => {
    for (const binding of SHORTCUT_BINDINGS) {
      expect(binding.labels.length).toBeGreaterThan(0);
      expect(binding.triggers.length).toBeGreaterThan(0);
    }
  });

  it('resolves the keys DESIGN.md §9.1 names', () => {
    expect(actionForKey(' ')).toBe('playPause');
    expect(actionForKey('[')).toBe('previousRound');
    expect(actionForKey(']')).toBe('nextRound');
    expect(actionForKey('Escape')).toBe('clearSelection');
    expect(actionForKey('?')).toBe('help');
  });

  it('leaves an unbound key alone, so the browser keeps it', () => {
    expect(actionForKey('F')).toBeUndefined();
    expect(actionForKey('Tab')).toBeUndefined();
  });
});
