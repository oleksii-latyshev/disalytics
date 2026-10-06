import type { Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { fromEditorTactic, toEditorTactic, withEditorTactic } from '../helpers/editor-tactic';
import { createNewTactic } from '../helpers/tactic-setup';

function crowded(): Tactic {
  const base = createNewTactic('de_mirage', 'T');
  const [root] = base.plans;
  const first = root?.steps[0];
  if (root === undefined || first === undefined) throw new Error('fixture');
  const [a, ...others] = first.players;
  if (a === undefined) throw new Error('fixture');
  const walked = {
    ...first,
    idea: 'take mid',
    players: [
      {
        ...a,
        route: {
          mode: 'points' as const,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 30 },
          ],
        },
        task: 'entry',
        delaySeconds: 2,
      },
      ...others,
    ],
    enemies: [{ id: 'e', at: { x: 1, y: 1 } }],
  };
  return {
    ...base,
    plans: [
      { ...root, steps: [walked, { ...walked, id: 'second', startsAt: 12 }] },
      {
        id: 'branch',
        condition: 'if A dies',
        parentId: root.id,
        forkAfter: 1,
        deaths: { 0: 2 },
        steps: [{ ...walked, id: 'b1', startsAt: 20 }],
      },
    ],
  };
}

describe('toEditorTactic', () => {
  it('shows a player where their route ends, and standing still where they stood', () => {
    const editor = toEditorTactic(crowded());
    expect(editor.steps[0]?.players[0]).toMatchObject({ slot: 0, x: 20, y: 30 });
    expect(editor.steps[0]?.players[1]).toMatchObject({
      slot: 1,
      x: crowded().spawns[1]?.x,
      y: crowded().spawns[1]?.y,
    });
  });

  it('reads the idea as notes and unpinned starts as a gap after the last step', () => {
    const editor = toEditorTactic(createNewTactic('de_mirage', 'T'));
    expect(editor.steps).toHaveLength(1);
    expect(editor.steps[0]?.timeOffsetSeconds).toBe(0);
    expect(toEditorTactic(crowded()).steps.map((step) => step.notes)).toEqual([
      'take mid',
      'take mid',
    ]);
  });
});

describe('fromEditorTactic', () => {
  it('leaves a tactic as it was when nothing was edited', () => {
    const tactic = crowded();
    expect(fromEditorTactic(tactic, toEditorTactic(tactic))).toEqual(tactic);
  });

  it('keeps a multi-point route, a task and enemies when the player did not move', () => {
    const tactic = withEditorTactic(crowded(), (editor) => ({
      ...editor,
      steps: editor.steps.map((step, i) => (i === 0 ? { ...step, name: 'renamed' } : step)),
    }));
    const [step] = tactic.plans[0]?.steps ?? [];
    expect(step?.name).toBe('renamed');
    expect(step?.players[0]).toMatchObject({ task: 'entry', delaySeconds: 2 });
    expect(step?.players[0]?.route.points).toHaveLength(2);
    expect(step?.enemies).toHaveLength(1);
  });

  it('writes a moved player as a one-point route and a player back on their spot as none', () => {
    const base = createNewTactic('de_mirage', 'T');
    const moved = withEditorTactic(base, (editor) => ({
      ...editor,
      steps: editor.steps.map((step) => ({
        ...step,
        players: step.players.map((p) => (p.slot === 2 ? { ...p, x: p.x + 50 } : p)),
      })),
    }));
    const route = moved.plans[0]?.steps[0]?.players.find((p) => p.slot === 2)?.route;
    expect(route?.points).toHaveLength(1);
    const back = withEditorTactic(moved, (editor) => ({
      ...editor,
      steps: editor.steps.map((step) => ({
        ...step,
        players: step.players.map((p) => (p.slot === 2 ? { ...p, x: p.x - 50 } : p)),
      })),
    }));
    expect(back.plans[0]?.steps[0]?.players.find((p) => p.slot === 2)?.route.points).toEqual([]);
  });

  it('pins a step the reader moved in time and keeps an unpinned one unpinned', () => {
    const base = createNewTactic('de_mirage', 'T');
    const unpinned = withEditorTactic(base, (editor) => ({ ...editor, title: 'x' }));
    expect(unpinned.plans[0]?.steps[0]?.startsAt).toBeNull();
    const pinned = withEditorTactic(base, (editor) => ({
      ...editor,
      steps: editor.steps.map((step) => ({ ...step, timeOffsetSeconds: 7 })),
    }));
    expect(pinned.plans[0]?.steps[0]?.startsAt).toBe(7);
  });

  it('leaves branches in place and clamps a fork when the main plan lost steps', () => {
    const tactic = withEditorTactic(crowded(), (editor) => ({
      ...editor,
      steps: editor.steps.slice(0, 1),
    }));
    expect(tactic.plans).toHaveLength(2);
    expect(tactic.plans[1]?.forkAfter).toBe(0);
  });
});
