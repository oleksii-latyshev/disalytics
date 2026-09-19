import type { Tactic, TacticStep } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  addDrawingStrokeToStep,
  addStep,
  addThrowToStep,
  clearDrawingsFromStep,
  computeTotalDuration,
  deleteDrawingStrokeFromStep,
  deleteStep,
  deleteThrowFromStep,
  duplicateStep,
  generateId,
  moveStep,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
  updatePlayerLabel,
  updatePlayerPosition,
  updatePlayerYaw,
  updateStepName,
  updateStepNotes,
  updateStepOffset,
  updateThrowPositionInStep,
} from '../helpers/editor-actions';

function createMockTactic(): Tactic {
  return {
    id: 'tactic-1',
    title: 'A Site Mirage Execute',
    map: 'de_mirage',
    side: 'T',
    author: 'IGL',
    description: 'Standard A site execution with 3 smokes',
    createdAt: 1000,
    updatedAt: 1000,
    steps: [
      {
        id: 'step-1',
        name: 'Spawn Setup',
        timeOffsetSeconds: 0,
        players: [
          { slot: 0, x: -1200, y: -800, yaw: 45, label: 'IGL' },
          { slot: 1, x: -1250, y: -750, yaw: 90, label: 'Entry' },
        ],
        throws: [],
        drawings: [],
      },
      {
        id: 'step-2',
        name: 'Lineup Smokes',
        timeOffsetSeconds: 5,
        players: [
          { slot: 0, x: -1100, y: -700, yaw: 45, label: 'IGL' },
          { slot: 1, x: -1050, y: -650, yaw: 90, label: 'Entry' },
        ],
        throws: [
          {
            id: 'throw-1',
            throwerSlot: 0,
            kind: 'smoke',
            from: { x: -1100, y: -700 },
            to: { x: -300, y: -400 },
            releaseTime: 0,
          },
        ],
        drawings: [
          {
            id: 'stroke-1',
            color: 'var(--color-ct)',
            points: [
              { x: -1100, y: -700 },
              { x: -800, y: -600 },
            ],
          },
        ],
      },
    ],
  };
}

describe('editor-actions', () => {
  describe('generateId', () => {
    it('generates unique IDs with requested prefix', () => {
      const id1 = generateId('step');
      const id2 = generateId('step');
      expect(id1.startsWith('step-')).toBe(true);
      expect(id2.startsWith('step-')).toBe(true);
      expect(id1).not.toBe(id2);
    });
  });

  describe('computeTotalDuration', () => {
    it('returns minimum 5 seconds for empty steps', () => {
      expect(computeTotalDuration([])).toBe(5);
    });

    it('calculates duration from last step offset + 3s margin, min 5s', () => {
      const steps1: TacticStep[] = [
        {
          id: '1',
          name: '1',
          timeOffsetSeconds: 1,
          players: [],
          throws: [],
        },
      ];
      // 1 + 3 = 4 < 5, so min 5
      expect(computeTotalDuration(steps1)).toBe(5);

      const steps2: TacticStep[] = [
        {
          id: '1',
          name: '1',
          timeOffsetSeconds: 10,
          players: [],
          throws: [],
        },
      ];
      // 10 + 3 = 13
      expect(computeTotalDuration(steps2)).toBe(13);
    });
  });

  describe('step operations', () => {
    it('adds a step inheriting players from previous step', () => {
      const tactic = createMockTactic();
      const result = addStep(tactic);

      expect(result.tactic.steps).toHaveLength(3);
      expect(result.newIndex).toBe(2);

      const newStep = result.tactic.steps[2];
      expect(newStep?.name).toBe('Step 3');
      expect(newStep?.timeOffsetSeconds).toBe(10); // 5 + 5
      expect(newStep?.players).toEqual(tactic.steps[1]?.players);
      expect(newStep?.throws).toEqual([]);
      expect(newStep?.drawings).toEqual([]);
    });

    it('duplicates a step at the given index with (Copy) name', () => {
      const tactic = createMockTactic();
      const result = duplicateStep(tactic, 0);

      expect(result.tactic.steps).toHaveLength(3);
      expect(result.newIndex).toBe(1);

      const duplicated = result.tactic.steps[1];
      expect(duplicated?.name).toBe('Spawn Setup (Copy)');
      expect(duplicated?.timeOffsetSeconds).toBe(2); // 0 + 2
      expect(duplicated?.players).toEqual(tactic.steps[0]?.players);
    });

    it('returns same tactic when duplicating non-existent index', () => {
      const tactic = createMockTactic();
      const result = duplicateStep(tactic, 99);
      expect(result.tactic).toBe(tactic);
      expect(result.newIndex).toBe(99);
    });

    it('deletes a step and clamps active index', () => {
      const tactic = createMockTactic();
      const result = deleteStep(tactic, 1, 1);

      expect(result.tactic.steps).toHaveLength(1);
      expect(result.newIndex).toBe(0);
      expect(result.tactic.steps[0]?.id).toBe('step-1');
    });

    it('prevents deleting the last remaining step', () => {
      const tactic = createMockTactic();
      const withOneStep: Tactic = { ...tactic, steps: [tactic.steps[0] as TacticStep] };
      const result = deleteStep(withOneStep, 0, 0);

      expect(result.tactic.steps).toHaveLength(1);
      expect(result.newIndex).toBe(0);
    });

    it('moves a step earlier and later', () => {
      const tactic = createMockTactic();

      // Move step 1 earlier -> becomes index 0
      const earlierResult = moveStep(tactic, 1, 'earlier');
      expect(earlierResult.tactic.steps[0]?.id).toBe('step-2');
      expect(earlierResult.tactic.steps[1]?.id).toBe('step-1');
      expect(earlierResult.newIndex).toBe(0);

      // Move step 0 later -> becomes index 1
      const laterResult = moveStep(tactic, 0, 'later');
      expect(laterResult.tactic.steps[0]?.id).toBe('step-2');
      expect(laterResult.tactic.steps[1]?.id).toBe('step-1');
      expect(laterResult.newIndex).toBe(1);

      // Boundary: moving step 0 earlier does nothing
      const noOp = moveStep(tactic, 0, 'earlier');
      expect(noOp.tactic).toBe(tactic);
      expect(noOp.newIndex).toBe(0);
    });

    it('updates step name, offset, and coaching notes', () => {
      const tactic = createMockTactic();

      const renamed = updateStepName(tactic, 0, 'New Name');
      expect(renamed.steps[0]?.name).toBe('New Name');

      const reoffset = updateStepOffset(tactic, 0, 15);
      expect(reoffset.steps[0]?.timeOffsetSeconds).toBe(15);

      const renoted = updateStepNotes(tactic, 0, 'Throw fast');
      expect(renoted.steps[0]?.notes).toBe('Throw fast');
    });
  });

  describe('player operations', () => {
    it('updates existing player position and adds missing player', () => {
      const tactic = createMockTactic();
      const step = tactic.steps[0] as TacticStep;

      // Update existing slot 0
      const updated = updatePlayerPosition(step, 0, { x: 100, y: 200 });
      expect(updated.players.find((p) => p.slot === 0)).toEqual({
        slot: 0,
        x: 100,
        y: 200,
        yaw: 45,
        label: 'IGL',
      });

      // Add new slot 4
      const added = updatePlayerPosition(step, 4, { x: 500, y: 600 });
      expect(added.players).toHaveLength(3);
      expect(added.players.find((p) => p.slot === 4)).toEqual({
        slot: 4,
        x: 500,
        y: 600,
      });
    });

    it('updates player yaw and label', () => {
      const tactic = createMockTactic();
      const step = tactic.steps[0] as TacticStep;

      const updatedYaw = updatePlayerYaw(step, 0, -90);
      expect(updatedYaw.players.find((p) => p.slot === 0)?.yaw).toBe(-90);

      const updatedLabel = updatePlayerLabel(step, 0, 'Anchor');
      expect(updatedLabel.players.find((p) => p.slot === 0)?.label).toBe('Anchor');
    });
  });

  describe('throw operations', () => {
    it('adds, updates position, and deletes throws', () => {
      const tactic = createMockTactic();
      const step = tactic.steps[0] as TacticStep;

      // Add throw
      const { step: withThrow, newThrow } = addThrowToStep(
        step,
        {
          kind: 'flash',
          from: { x: 0, y: 0 },
          to: { x: 50, y: 100 },
        },
        1,
      );
      expect(withThrow.throws).toHaveLength(1);
      expect(newThrow.kind).toBe('flash');
      expect(newThrow.throwerSlot).toBe(1);
      expect(newThrow.releaseTime).toBe(0);

      // Update throw endpoint
      const moved = updateThrowPositionInStep(withThrow, newThrow.id, 'to', { x: 200, y: 300 });
      expect(moved.throws[0]?.to).toEqual({ x: 200, y: 300 });

      // Delete throw
      const deleted = deleteThrowFromStep(moved, newThrow.id);
      expect(deleted.throws).toHaveLength(0);
    });
  });

  describe('drawing operations', () => {
    it('adds, deletes, and clears drawing strokes', () => {
      const tactic = createMockTactic();
      const step = tactic.steps[0] as TacticStep;

      // Add stroke
      const withDrawing = addDrawingStrokeToStep(step, {
        color: 'var(--color-t)',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      });
      expect(withDrawing.drawings).toHaveLength(1);
      expect(withDrawing.drawings?.[0]?.color).toBe('var(--color-t)');
      expect(withDrawing.drawings?.[0]?.id).toBeDefined();

      // Delete stroke
      const withoutDrawing = deleteDrawingStrokeFromStep(withDrawing, 0);
      expect(withoutDrawing.drawings).toHaveLength(0);

      // Clear drawings
      const multi = addDrawingStrokeToStep(withDrawing, { color: 'white', points: [] });
      const cleared = clearDrawingsFromStep(multi);
      expect(cleared.drawings).toEqual([]);
    });
  });

  describe('history state management (undo/redo)', () => {
    it('pushes snapshots up to MAX_HISTORY', () => {
      const tactic = createMockTactic();
      let past: readonly Tactic[] = [];

      for (let i = 0; i < 35; i++) {
        past = pushHistoryState(past, { ...tactic, title: `Version ${i}` }, 30);
      }

      expect(past).toHaveLength(30);
      expect(past[0]?.title).toBe('Version 5');
      expect(past[29]?.title).toBe('Version 34');
    });

    it('manages undo and redo states accurately', () => {
      const t1 = { ...createMockTactic(), title: 'State 1' };
      const t2 = { ...createMockTactic(), title: 'State 2' };
      const t3 = { ...createMockTactic(), title: 'State 3' };

      const past = [t1, t2];
      const future: readonly Tactic[] = [];
      const current = t3;

      // Undo once: from t3 to t2
      const undo1 = undoHistoryState(past, future, current);
      expect(undo1).not.toBeNull();
      expect(undo1?.current.title).toBe('State 2');
      expect(undo1?.past).toHaveLength(1);
      expect(undo1?.future[0]?.title).toBe('State 3');

      // Undo twice: from t2 to t1
      const undo2 = undoHistoryState(undo1?.past ?? [], undo1?.future ?? [], undo1?.current ?? t2);
      expect(undo2?.current.title).toBe('State 1');
      expect(undo2?.past).toHaveLength(0);

      // Undo with empty past returns null
      const undo3 = undoHistoryState([], undo2?.future ?? [], undo2?.current ?? t1);
      expect(undo3).toBeNull();

      // Redo once: from t1 to t2
      const redo1 = redoHistoryState(undo2?.past ?? [], undo2?.future ?? [], undo2?.current ?? t1);
      expect(redo1).not.toBeNull();
      expect(redo1?.current.title).toBe('State 2');

      // Redo with empty future returns null
      const redoEmpty = redoHistoryState([], [], t1);
      expect(redoEmpty).toBeNull();
    });
  });
});
