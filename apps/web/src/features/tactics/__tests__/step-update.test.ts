import { describe, expect, it } from 'vitest';
import type { EditorStep, EditorTactic } from '../helpers/editor-tactic';
import { updateStepAt } from '../helpers/step-update';

function step(name: string): EditorStep {
  return { id: name, name, timeOffsetSeconds: 0, players: [], throws: [] };
}

function tacticOf(steps: readonly EditorStep[]): EditorTactic {
  return {
    id: 't',
    title: 't',
    map: 'de_mirage',
    side: 'CT',
    spawns: [],
    steps,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('updateStepAt', () => {
  it('replaces only the step at the index', () => {
    const tactic = tacticOf([step('a'), step('b')]);

    const next = updateStepAt(tactic, 1, (s) => ({ ...s, name: 'renamed' }));

    expect(next.steps.map((s) => s.name)).toEqual(['a', 'renamed']);
  });

  it('returns the same tactic for an index with no step', () => {
    const tactic = tacticOf([step('a')]);

    expect(updateStepAt(tactic, 3, (s) => s)).toBe(tactic);
  });
});
