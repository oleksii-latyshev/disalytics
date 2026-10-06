import { effectiveSteps } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { editorReducer, initialEditorState, stepCountOf } from '../helpers/tactic-editor-state';
import { addWaypoint, renameStep } from '../helpers/tactic-edits';
import { createNewTactic } from '../helpers/tactic-setup';

const start = () => initialEditorState(createNewTactic('de_mirage', 'T'));

describe('editorReducer', () => {
  it('edits the step in view and undoes it', () => {
    const edited = editorReducer(start(), {
      type: 'edit',
      update: (tactic, at) => addWaypoint(tactic, at, 0, { x: 1, y: 1 }),
    });
    const route = (state: typeof edited) =>
      effectiveSteps(state.history.present, state.planId)[0]?.players[0]?.route.points;
    expect(route(edited)).toHaveLength(1);
    expect(route(editorReducer(edited, { type: 'undo' }))).toHaveLength(0);
  });

  it('moves to the step it adds and keeps the index inside the plan after a delete', () => {
    let state = editorReducer(start(), { type: 'addStep' });
    expect(state.stepIndex).toBe(1);
    expect(stepCountOf(state)).toBe(2);
    state = editorReducer(state, { type: 'deleteStep' });
    expect(stepCountOf(state)).toBe(1);
    expect(state.stepIndex).toBe(0);
    expect(editorReducer(state, { type: 'deleteStep' })).toBe(state);
  });

  it('folds typing into one undo step until the gesture ends', () => {
    let state = start();
    for (const name of ['a', 'ab', 'abc']) {
      state = editorReducer(state, {
        type: 'edit',
        gesture: 'name',
        update: (tactic, at) => renameStep(tactic, at, name),
      });
    }
    expect(state.history.past).toHaveLength(1);
  });

  it('keeps tool and grenade kind across a replaced tactic and clamps a step index', () => {
    let state = editorReducer(start(), { type: 'throwKind', kind: 'he' });
    state = editorReducer(state, { type: 'goToStep', index: 9 });
    expect(state.stepIndex).toBe(0);
    const replaced = editorReducer(state, {
      type: 'replace',
      tactic: createNewTactic('de_dust2', 'CT'),
    });
    expect(replaced.tool).toBe('grenade');
    expect(replaced.throwKind).toBe('he');
    expect(replaced.history.past).toHaveLength(0);
  });
});
