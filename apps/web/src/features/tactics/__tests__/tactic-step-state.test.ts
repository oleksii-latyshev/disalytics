import { describe, expect, it } from 'vitest';
import type { EditorStep } from '../helpers/editor-tactic';
import { tacticStateAt } from '../helpers/tactic-step-state';

const steps: readonly EditorStep[] = [
  {
    id: 'a',
    name: 'a',
    timeOffsetSeconds: 0,
    players: [{ slot: 0, x: 1, y: 2 }],
    throws: [],
    drawings: [{ id: 's', color: '#fff', points: [{ x: 0, y: 0 }] }],
  },
  { id: 'b', name: 'b', timeOffsetSeconds: 4, players: [{ slot: 0, x: 5, y: 6 }], throws: [] },
];

describe('tacticStateAt', () => {
  it('shows the active step as it stands when no time is given', () => {
    const state = tacticStateAt(steps, 1, undefined);

    expect(state.players).toEqual(steps[1]?.players);
    expect(state.activeStepIndex).toBe(1);
    expect(state.drawings).toEqual([]);
  });

  it('falls back to the first step for an index past the end', () => {
    expect(tacticStateAt(steps, 9, undefined).players).toEqual(steps[0]?.players);
  });

  it('is empty without steps', () => {
    expect(tacticStateAt([], 0, undefined).players).toEqual([]);
  });

  it('interpolates when a time is given', () => {
    expect(tacticStateAt(steps, 0, 0).players[0]).toMatchObject({ slot: 0, x: 1, y: 2 });
  });
});
