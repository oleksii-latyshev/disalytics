import { effectiveSteps, type Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { editorReducer, initialEditorState } from '../helpers/tactic-editor-state';
import { addStepAfter } from '../helpers/tactic-edits';
import {
  enemyGhostsAt,
  enemyMarksByStep,
  oppositeSide,
  stepEnemiesSummary,
} from '../helpers/tactic-enemies';
import {
  addEnemy,
  moveEnemy,
  newEnemy,
  removeEnemy,
  setEnemyDead,
  setEnemyNote,
  setEnemyRole,
  setEnemyTaker,
} from '../helpers/tactic-enemy-edits';
import { boardHint } from '../helpers/tactic-hint';
import { createNewTactic } from '../helpers/tactic-setup';
import { resolveShortcut } from '../helpers/tactic-shortcuts';

const planOf = (tactic: Tactic) => tactic.plans[0]?.id ?? '';

function twoSteps(): Tactic {
  const base = createNewTactic('de_mirage', 'T');
  return addStepAfter(base, planOf(base), 0, base.spawns.length);
}

const first = (tactic: Tactic) => ({ planId: planOf(tactic), stepIndex: 0 });
const stepsOf = (tactic: Tactic) => effectiveSteps(tactic, planOf(tactic));

describe('enemy edits', () => {
  it('adds, moves, describes and removes an enemy of one step only', () => {
    const base = twoSteps();
    const enemy = newEnemy({ x: 10, y: 20 });
    let tactic = addEnemy(base, first(base), enemy);
    tactic = moveEnemy(tactic, first(base), enemy.id, { x: 30, y: 40 });
    tactic = setEnemyNote(tactic, first(base), enemy.id, 'AWP holds window');
    tactic = setEnemyTaker(tactic, first(base), enemy.id, 2);
    const [one, two] = stepsOf(tactic);
    expect(one?.enemies).toEqual([
      { id: enemy.id, at: { x: 30, y: 40 }, note: 'AWP holds window', killedBy: 2 },
    ]);
    expect(two?.enemies).toBeUndefined();

    const cleared = removeEnemy(tactic, first(base), enemy.id);
    expect(stepsOf(cleared)[0]?.enemies).toEqual([]);
  });

  it('toggles a role off when it is picked twice and clears note and taker', () => {
    const base = twoSteps();
    const enemy = newEnemy({ x: 1, y: 1 });
    let tactic = addEnemy(base, first(base), enemy);
    tactic = setEnemyRole(tactic, first(base), enemy.id, 'awp');
    expect(stepsOf(tactic)[0]?.enemies?.[0]?.role).toBe('awp');
    tactic = setEnemyRole(tactic, first(base), enemy.id, 'awp');
    expect(stepsOf(tactic)[0]?.enemies?.[0]?.role).toBeUndefined();

    tactic = setEnemyTaker(
      setEnemyNote(tactic, first(base), enemy.id, 'x'),
      first(base),
      enemy.id,
      1,
    );
    tactic = setEnemyTaker(
      setEnemyNote(tactic, first(base), enemy.id, ''),
      first(base),
      enemy.id,
      null,
    );
    expect(stepsOf(tactic)[0]?.enemies?.[0]).toEqual({ id: enemy.id, at: { x: 1, y: 1 } });
  });

  it('marks killed and brings back', () => {
    const base = twoSteps();
    const enemy = newEnemy({ x: 1, y: 1 });
    const dead = setEnemyDead(addEnemy(base, first(base), enemy), first(base), enemy.id, true);
    expect(stepsOf(dead)[0]?.enemies?.[0]?.isDead).toBe(true);
    expect(
      stepsOf(setEnemyDead(dead, first(base), enemy.id, false))[0]?.enemies?.[0]?.isDead,
    ).toBeUndefined();
  });

  it('edits through the editor so it undoes', () => {
    const state = initialEditorState(twoSteps());
    const enemy = newEnemy({ x: 5, y: 5 });
    const added = editorReducer(state, {
      type: 'edit',
      update: (tactic, at) => addEnemy(tactic, at, enemy),
    });
    expect(stepsOf(added.history.present)[0]?.enemies).toHaveLength(1);
    const undone = editorReducer(added, { type: 'undo' });
    expect(stepsOf(undone.history.present)[0]?.enemies).toBeUndefined();
  });
});

describe('enemy ghosts', () => {
  function plan(): Tactic {
    const base = twoSteps();
    const alive = newEnemy({ x: 1, y: 1 });
    const dead = { ...newEnemy({ x: 2, y: 2 }), isDead: true, killedBy: 0 };
    let tactic = addEnemy(base, first(base), alive);
    tactic = addEnemy(tactic, first(base), dead);
    return addStepAfter(tactic, planOf(tactic), 1, tactic.spawns.length);
  }

  it('carries the dead of earlier steps into later ones, never into their own', () => {
    const steps = stepsOf(plan());
    expect(enemyGhostsAt(steps, 0)).toEqual([]);
    expect(enemyGhostsAt(steps, 1).map((enemy) => enemy.at)).toEqual([{ x: 2, y: 2 }]);
    expect(enemyGhostsAt(steps, 2)).toHaveLength(1);
  });

  it('reads per step for playback, with the live marks of each', () => {
    const marks = enemyMarksByStep(stepsOf(plan()));
    expect(marks.map((mark) => [mark.live.length, mark.ghosts.length])).toEqual([
      [2, 0],
      [0, 1],
      [0, 1],
    ]);
  });

  it('follows the plan it is asked about', () => {
    const tactic = plan();
    expect(enemyMarksByStep(stepsOf(tactic))).toHaveLength(3);
    expect(enemyMarksByStep([])).toEqual([]);
  });
});

describe('stepEnemiesSummary', () => {
  it('lists what a step expects, in plain facts', () => {
    const base = twoSteps();
    const a = {
      ...newEnemy({ x: 1, y: 1 }),
      note: ' AWP window ',
      role: 'awp' as const,
      killedBy: 3,
    };
    const b = { ...newEnemy({ x: 2, y: 2 }), isDead: true };
    const tactic = addEnemy(addEnemy(base, first(base), a), first(base), b);
    const summary = stepEnemiesSummary(stepsOf(tactic)[0]);
    expect(summary.count).toBe(2);
    expect(summary.deadCount).toBe(1);
    expect(summary.entries).toEqual([
      { id: a.id, note: 'AWP window', role: 'awp', takenBy: 3, isDead: false },
      { id: b.id, note: '', role: null, takenBy: null, isDead: true },
    ]);
  });

  it('is empty for a step without enemies or no step', () => {
    expect(stepEnemiesSummary(stepsOf(twoSteps())[0])).toEqual({
      count: 0,
      deadCount: 0,
      entries: [],
    });
    expect(stepEnemiesSummary(undefined).count).toBe(0);
  });
});

describe('the enemy tool in the editor', () => {
  it('picks an enemy instead of a player and back', () => {
    const state = initialEditorState(twoSteps());
    const picked = editorReducer(state, { type: 'selectEnemy', id: 'enemy-1' });
    expect(picked.selectedEnemyId).toBe('enemy-1');
    expect(picked.selectedSlot).toBeNull();
    const player = editorReducer(picked, { type: 'select', slot: 2 });
    expect(player.selectedEnemyId).toBeNull();
    expect(player.selectedSlot).toBe(2);
    expect(editorReducer(player, { type: 'tool', tool: 'enemy' }).tool).toBe('enemy');
  });

  it('has a key and a hint, and the other side is the opposite', () => {
    expect(
      resolveShortcut({ key: 'e', code: 'KeyE', ctrl: false, shift: false, alt: false }),
    ).toEqual({
      type: 'tool',
      tool: 'enemy',
    });
    const input = {
      tool: 'enemy',
      selectedSlot: null,
      isDead: false,
      isShown: false,
      isPreviewUnreachable: null,
      lineupCount: 0,
    } as const;
    expect(boardHint(input).key).toBe('enemy');
    expect(boardHint({ ...input, hasPickedEnemy: true }).key).toBe('enemyPicked');
    expect(boardHint({ ...input, isShown: true }).key).toBe('playing');
    expect(oppositeSide('T')).toBe('CT');
    expect(oppositeSide('CT')).toBe('T');
  });
});
