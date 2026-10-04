import type {
  Lineup,
  Tactic,
  TacticDrawingStroke,
  TacticRound,
  TacticSide,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';
import { useCallback, useState } from 'react';
import {
  addDrawingStrokeToStep,
  addStep as addStepAction,
  addThrowToStep,
  clearDrawingsFromStep,
  deleteDrawingStrokeFromStep,
  deleteStep as deleteStepAction,
  deleteThrowFromStep,
  duplicateStep as duplicateStepAction,
  generateId,
  moveStep as moveStepAction,
  updatePlayerLabel as updatePlayerLabelAction,
  updatePlayerPosition as updatePlayerPositionAction,
  updatePlayerYaw as updatePlayerYawAction,
  updateStepName as updateStepNameAction,
  updateStepNotes as updateStepNotesAction,
  updateStepOffset as updateStepOffsetAction,
  updateThrowDroppedBy as updateThrowDroppedByAction,
  updateThrowPositionInStep,
} from '../helpers/editor-actions';
import { addLineupThrowToStep } from '../helpers/lineup-throw';
import { updateStepAt } from '../helpers/step-update';
import { changeTacticMap, changeTacticSide, toggleTacticRound } from '../helpers/tactic-setup';
import { useTacticHistory } from './use-tactic-history';
import { useTacticPlayback } from './use-tactic-playback';

export type TacticTool = 'select' | 'pencil' | 'throw' | 'eraser';

export interface UseTacticEditorOptions {
  readonly initialTactic: Tactic;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
}

export { generateId };

export function useTacticEditor({ initialTactic, onSave }: UseTacticEditorOptions) {
  const [tactic, setTactic] = useState<Tactic>(initialTactic);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedThrowId, setSelectedThrowId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<TacticTool>('select');
  const [pencilColor, setPencilColor] = useState('var(--color-ct)');
  const [newThrowKind, setNewThrowKind] = useState<UtilityKind>('smoke');

  const { canUndo, canRedo, pushHistory, undo, redo } = useTacticHistory(tactic, setTactic);

  const updateTactic = useCallback(
    (updater: (prev: Tactic) => Tactic) => {
      setTactic((prev) => {
        pushHistory(prev);
        const next = updater(prev);
        return { ...next, updatedAt: Date.now() };
      });
    },
    [pushHistory],
  );

  // Step operations
  const addStep = useCallback(() => {
    updateTactic((curr) => {
      const res = addStepAction(curr);
      setActiveStepIndex(res.newIndex);
      return res.tactic;
    });
  }, [updateTactic]);

  const duplicateStep = useCallback(
    (index: number) => {
      updateTactic((curr) => {
        const res = duplicateStepAction(curr, index);
        setActiveStepIndex(res.newIndex);
        return res.tactic;
      });
    },
    [updateTactic],
  );

  const deleteStep = useCallback(
    (index: number) => {
      updateTactic((curr) => {
        const res = deleteStepAction(curr, index, activeStepIndex);
        setActiveStepIndex(res.newIndex);
        return res.tactic;
      });
    },
    [activeStepIndex, updateTactic],
  );

  const moveStep = useCallback(
    (index: number, direction: 'earlier' | 'later') => {
      updateTactic((curr) => {
        const res = moveStepAction(curr, index, direction);
        setActiveStepIndex(res.newIndex);
        return res.tactic;
      });
    },
    [updateTactic],
  );

  const updateStepName = useCallback(
    (index: number, name: string) => {
      updateTactic((curr) => updateStepNameAction(curr, index, name));
    },
    [updateTactic],
  );

  const updateStepOffset = useCallback(
    (index: number, timeOffsetSeconds: number) => {
      updateTactic((curr) => updateStepOffsetAction(curr, index, timeOffsetSeconds));
    },
    [updateTactic],
  );

  const updateStepNotes = useCallback(
    (index: number, notes: string) => {
      updateTactic((curr) => updateStepNotesAction(curr, index, notes));
    },
    [updateTactic],
  );

  // Player position updates on the active step
  const updatePlayerPosition = useCallback(
    (slot: number, worldPos: { x: number; y: number }) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          updatePlayerPositionAction(step, slot, worldPos),
        ),
      );
    },
    [activeStepIndex, updateTactic],
  );

  const updatePlayerYaw = useCallback(
    (slot: number, yaw: number) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => updatePlayerYawAction(step, slot, yaw)),
      );
    },
    [activeStepIndex, updateTactic],
  );

  const updatePlayerLabel = useCallback(
    (slot: number, label: string) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => updatePlayerLabelAction(step, slot, label)),
      );
    },
    [activeStepIndex, updateTactic],
  );

  // Throw operations on the active step
  const addThrow = useCallback(
    (
      t:
        | Omit<TacticThrow, 'id'>
        | (Pick<TacticThrow, 'kind' | 'from' | 'to'> & Partial<TacticThrow>),
    ) => {
      let createdThrowId: string | null = null;
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => {
          const { step: updatedStep, newThrow } = addThrowToStep(step, t, selectedSlot ?? 0);
          createdThrowId = newThrow.id;
          return updatedStep;
        }),
      );

      if (createdThrowId !== null) {
        setSelectedThrowId(createdThrowId);
      }
    },
    [activeStepIndex, selectedSlot, updateTactic],
  );

  const updateThrowPosition = useCallback(
    (throwId: string, end: 'from' | 'to', worldPos: { x: number; y: number }) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          updateThrowPositionInStep(step, throwId, end, worldPos),
        ),
      );
    },
    [activeStepIndex, updateTactic],
  );

  const updateThrowDroppedBy = useCallback(
    (throwId: string, droppedBy: number | undefined) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          updateThrowDroppedByAction(step, throwId, droppedBy),
        ),
      );
    },
    [activeStepIndex, updateTactic],
  );

  const deleteThrow = useCallback(
    (throwId: string) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => deleteThrowFromStep(step, throwId)),
      );

      if (selectedThrowId === throwId) {
        setSelectedThrowId(null);
      }
    },
    [activeStepIndex, selectedThrowId, updateTactic],
  );

  // Drawing operations on the active step
  const addDrawingStroke = useCallback(
    (stroke: TacticDrawingStroke | Omit<TacticDrawingStroke, 'id'>) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => addDrawingStrokeToStep(step, stroke)),
      );
    },
    [activeStepIndex, updateTactic],
  );

  const deleteDrawingStroke = useCallback(
    (strokeIndex: number) => {
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          deleteDrawingStrokeFromStep(step, strokeIndex),
        ),
      );
    },
    [activeStepIndex, updateTactic],
  );

  const clearDrawings = useCallback(() => {
    updateTactic((curr) =>
      updateStepAt(curr, activeStepIndex, (step) => clearDrawingsFromStep(step)),
    );
  }, [activeStepIndex, updateTactic]);

  const addLineupThrow = useCallback(
    (lineup: Lineup) => {
      if (selectedSlot === null) return;
      updateTactic((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          addLineupThrowToStep(step, lineup, selectedSlot),
        ),
      );
    },
    [activeStepIndex, selectedSlot, updateTactic],
  );

  const changeMap = useCallback(
    (map: string) => {
      updateTactic((curr) => changeTacticMap(curr, map));
      setSelectedThrowId(null);
    },
    [updateTactic],
  );

  const changeSide = useCallback(
    (side: TacticSide) => {
      updateTactic((curr) => changeTacticSide(curr, side));
    },
    [updateTactic],
  );

  const toggleRound = useCallback(
    (round: TacticRound) => {
      updateTactic((curr) => toggleTacticRound(curr, round));
    },
    [updateTactic],
  );

  const updateTitle = useCallback(
    (title: string) => {
      updateTactic((curr) => ({ ...curr, title }));
    },
    [updateTactic],
  );

  const updateDescription = useCallback(
    (description: string) => {
      updateTactic((curr) => ({ ...curr, description }));
    },
    [updateTactic],
  );

  const save = useCallback(() => {
    onSave?.(tactic);
  }, [tactic, onSave]);

  const playback = useTacticPlayback({
    steps: tactic.steps,
    activeStepIndex,
    setActiveStepIndex,
  });

  return {
    tactic,
    activeStepIndex,
    activeStep: tactic.steps[activeStepIndex] ?? tactic.steps[0],
    selectedSlot,
    selectedThrowId,
    activeTool,
    pencilColor,
    newThrowKind,
    canUndo,
    canRedo,
    ...playback.state,
    setActiveStepIndex,
    setSelectedSlot,
    setSelectedThrowId,
    setActiveTool,
    setPencilColor,
    setNewThrowKind,
    setPlaybackSpeed: playback.setPlaybackSpeed,
    undo,
    redo,
    addStep,
    duplicateStep,
    deleteStep,
    moveStep,
    updateStepName,
    updateStepOffset,
    updateStepNotes,
    updatePlayerPosition,
    updatePlayerYaw,
    updatePlayerLabel,
    addThrow,
    addLineupThrow,
    updateThrowPosition,
    updateThrowDroppedBy,
    deleteThrow,
    addDrawingStroke,
    deleteDrawingStroke,
    clearDrawings,
    changeMap,
    changeSide,
    toggleRound,
    updateTitle,
    updateDescription,
    save,
    togglePlay: playback.togglePlay,
    seek: playback.seek,
    jumpStep: playback.jumpStep,
    selectStep: playback.selectStep,
  };
}
