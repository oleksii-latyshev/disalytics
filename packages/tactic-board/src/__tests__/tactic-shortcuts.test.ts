import { describe, expect, it } from 'vitest';
import { type KeyPress, resolveShortcut } from '../helpers/tactic-shortcuts';

const press = (key: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  key,
  code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`,
  ctrl: false,
  shift: false,
  alt: false,
  ...extra,
});

describe('resolveShortcut', () => {
  it('reads tools, grenades, players and navigation', () => {
    expect(resolveShortcut(press('r'))).toEqual({ type: 'tool', tool: 'route' });
    expect(resolveShortcut(press('s'))).toEqual({ type: 'grenade', kind: 'smoke' });
    expect(resolveShortcut(press('3'))).toEqual({ type: 'player', slot: 2 });
    expect(resolveShortcut(press(' '))).toEqual({ type: 'play' });
    expect(resolveShortcut(press('ArrowRight'))).toEqual({ type: 'step', direction: 'next' });
    expect(resolveShortcut(press('Backspace'))).toEqual({ type: 'removePoint' });
  });

  it('keeps modified keys for history and save', () => {
    expect(resolveShortcut(press('z', { ctrl: true }))).toEqual({ type: 'undo' });
    expect(resolveShortcut(press('z', { ctrl: true, shift: true }))).toEqual({ type: 'redo' });
    expect(resolveShortcut(press('s', { ctrl: true }))).toEqual({ type: 'save' });
    expect(resolveShortcut(press('r', { ctrl: true }))).toBeNull();
  });

  it('ignores shifted and alted presses', () => {
    expect(resolveShortcut(press('r', { shift: true }))).toBeNull();
    expect(resolveShortcut(press('r', { alt: true }))).toBeNull();
  });
});
