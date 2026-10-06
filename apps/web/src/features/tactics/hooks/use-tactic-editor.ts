import type {
  Lineup,
  Tactic,
  TacticDrawingStroke,
  TacticRound,
  TacticSide,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';
import { mapSpawns } from '@disa/map-data';
import { useCallback, useMemo, useState } from 'react';
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
import { type EditorTactic, toEditorTactic, withEditorTactic } from '../helpers/editor-tactic';
import { addLineupThrowToStep } from '../helpers/lineup-throw';
import { updateStepAt } from '../helpers/step-update';
import { changeTacticMap, changeTacticSide, toggleTacticRound } from '../helpers/tactic-setup';
import { assignPlayerToSpawn, snapPlayerToSpawn } from '../helpers/tactic-spawns';
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

  const steps = useMemo(() => toEditorTactic(tactic).steps, [tactic]);
  const spawns = useMemo(() => mapSpawns(tactic.map, tactic.side), [tactic.map, tactic.side]);
  const isOpeningStep = activeStepIndex === 0;

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

  const updateEditor = useCallback(
    (updater: (prev: EditorTactic) => EditorTactic) => {
      updateTactic((prev) => withEditorTactic(prev, updater));
    },
    [updateTactic],
  );

  // Step operations
  const addStep = useCallback(() => {
    updateEditor((curr) => {
      const res = addStepAction(curr);
      setActiveStepIndex(res.newIndex);
      return res.tactic;
    });
  }, [updateEditor]);

  const duplicateStep = useCallback(
    (index: number) => {
      updateEditor((curr) => {
        const res = duplicateStepAction(curr, index);
        setActiveStepIndex(res.newIndex);
        return res.tactic;
      });
    },
    [updateEditor],
  );

  const deleteStep = useCallback(
    (index: number) => {
      updateEditor((curr) => {
        const res = deleteStepAction(curr, index, activeStepIndex);
        setActiveStepIndex(res.newIndex);
        return res.tactic;
      });
    },
    [activeStepIndex, updateEditor],
  );

  const moveStep = useCallback(
    (index: number, direction: 'earlier' | 'later') => {
      updateEditor((curr) => {
        const res = moveStepAction(curr, index, direction);
        setActiveStepIndex(res.newIndex);
        return res.tactic;
      });
    },
    [updateEditor],
  );

  const updateStepName = useCallback(
    (index: number, name: string) => {
      updateEditor((curr) => updateStepNameAction(curr, index, name));
    },
    [updateEditor],
  );

  const updateStepOffset = useCallback(
    (index: number, timeOffsetSeconds: number) => {
      updateEditor((curr) => updateStepOffsetAction(curr, index, timeOffsetSeconds));
    },
    [updateEditor],
  );

  const updateStepNotes = useCallback(
    (index: number, notes: string) => {
      updateEditor((curr) => updateStepNotesAction(curr, index, notes));
    },
    [updateEditor],
  );

  // Player position updates on the active step
  const updatePlayerPosition = useCallback(
    (slot: number, worldPos: { x: number; y: number }) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          updatePlayerPositionAction(step, slot, worldPos),
        ),
      );
    },
    [activeStepIndex, updateEditor],
  );

  const placePlayerOnSpawn = useCallback(
    (slot: number, spot: number) => {
      if (!isOpeningStep) return;
      updateEditor((curr) =>
        updateStepAt(curr, 0, (step) => assignPlayerToSpawn(step, slot, spawns, spot)),
      );
    },
    [isOpeningStep, spawns, updateEditor],
  );

  const snapPlayerToSpawnSpot = useCallback(
    (slot: number) => {
      if (!isOpeningStep || spawns.length === 0) return;
      updateEditor((curr) =>
        updateStepAt(curr, 0, (step) => snapPlayerToSpawn(step, slot, spawns)),
      );
    },
    [isOpeningStep, spawns, updateEditor],
  );

  const updatePlayerYaw = useCallback(
    (slot: number, yaw: number) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => updatePlayerYawAction(step, slot, yaw)),
      );
    },
    [activeStepIndex, updateEditor],
  );

  const updatePlayerLabel = useCallback(
    (slot: number, label: string) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => updatePlayerLabelAction(step, slot, label)),
      );
    },
    [activeStepIndex, updateEditor],
  );

  // Throw operations on the active step
  const addThrow = useCallback(
    (
      t:
        | Omit<TacticThrow, 'id'>
        | (Pick<TacticThrow, 'kind' | 'from' | 'to'> & Partial<TacticThrow>),
    ) => {
      let createdThrowId: string | null = null;
      updateEditor((curr) =>
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
    [activeStepIndex, selectedSlot, updateEditor],
  );

  const updateThrowPosition = useCallback(
    (throwId: string, end: 'from' | 'to', worldPos: { x: number; y: number }) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          updateThrowPositionInStep(step, throwId, end, worldPos),
        ),
      );
    },
    [activeStepIndex, updateEditor],
  );

  const updateThrowDroppedBy = useCallback(
    (throwId: string, droppedBy: number | undefined) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          updateThrowDroppedByAction(step, throwId, droppedBy),
        ),
      );
    },
    [activeStepIndex, updateEditor],
  );

  const deleteThrow = useCallback(
    (throwId: string) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => deleteThrowFromStep(step, throwId)),
      );

      if (selectedThrowId === throwId) {
        setSelectedThrowId(null);
      }
    },
    [activeStepIndex, selectedThrowId, updateEditor],
  );

  // Drawing operations on the active step
  const addDrawingStroke = useCallback(
    (stroke: TacticDrawingStroke | Omit<TacticDrawingStroke, 'id'>) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) => addDrawingStrokeToStep(step, stroke)),
      );
    },
    [activeStepIndex, updateEditor],
  );

  const deleteDrawingStroke = useCallback(
    (strokeIndex: number) => {
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          deleteDrawingStrokeFromStep(step, strokeIndex),
        ),
      );
    },
    [activeStepIndex, updateEditor],
  );

  const clearDrawings = useCallback(() => {
    updateEditor((curr) =>
      updateStepAt(curr, activeStepIndex, (step) => clearDrawingsFromStep(step)),
    );
  }, [activeStepIndex, updateEditor]);

  const addLineupThrow = useCallback(
    (lineup: Lineup) => {
      if (selectedSlot === null) return;
      updateEditor((curr) =>
        updateStepAt(curr, activeStepIndex, (step) =>
          addLineupThrowToStep(step, lineup, selectedSlot, isOpeningStep ? spawns : []),
        ),
      );
    },
    [activeStepIndex, isOpeningStep, selectedSlot, spawns, updateEditor],
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
    steps: steps,
    activeStepIndex,
    setActiveStepIndex,
  });

  return {
    tactic,
    activeStepIndex,
    spawns,
    steps,
    activeStep: steps[activeStepIndex] ?? steps[0],
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
    placePlayerOnSpawn,
    snapPlayerToSpawnSpot,
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
