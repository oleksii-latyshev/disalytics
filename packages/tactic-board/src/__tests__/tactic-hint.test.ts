import { describe, expect, it } from 'vitest';
import { type BoardHintInput, boardHint } from '../helpers/tactic-hint';

const base: BoardHintInput = {
  tool: 'route',
  selectedSlot: 1,
  isDead: false,
  isShown: false,
  isPreviewUnreachable: null,
  lineupCount: 3,
};

describe('boardHint', () => {
  it('asks for a player before any tool can act', () => {
    expect(boardHint({ ...base, selectedSlot: null }).key).toBe('pickPlayer');
  });

  it('names the player and warns when the path has no walkable way', () => {
    expect(boardHint(base)).toEqual({ key: 'route', slot: 2 });
    expect(boardHint({ ...base, isPreviewUnreachable: true }).key).toBe('routeBroken');
  });

  it('prefers playback, then a dead player, over the tool', () => {
    expect(boardHint({ ...base, isShown: true }).key).toBe('playing');
    expect(boardHint({ ...base, isDead: true }).key).toBe('dead');
  });

  it('tells a grenade with no lineups to throw by hand', () => {
    expect(boardHint({ ...base, tool: 'grenade', lineupCount: 0 }).key).toBe('grenadeNone');
    expect(boardHint({ ...base, tool: 'grenade' }).key).toBe('grenade');
  });
});
