import type { Tactic, TacticDrawingStroke, TacticThrow, UtilityKind } from '@disa/demo-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDrawingStrokeToStep,
  addStep as addStepAction,
  addThrowToStep,
  clearDrawingsFromStep,
  computeTotalDuration,
  deleteDrawingStrokeFromStep,
  deleteStep as deleteStepAction,
  deleteThrowFromStep,
  duplicateStep as duplicateStepAction,
  generateId,
  moveStep as moveStepAction,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
  updatePlayerLabel as updatePlayerLabelAction,
  updatePlayerPosition as updatePlayerPositionAction,
  updatePlayerYaw as updatePlayerYawAction,
  updateStepName as updateStepNameAction,
  updateStepNotes as updateStepNotesAction,
  updateStepOffset as updateStepOffsetAction,
  updateThrowPositionInStep,
} from '../helpers/editor-actions';

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

  // History for Undo/Redo
  const [history, setHistory] = useState<{
    readonly past: readonly Tactic[];
    readonly future: readonly Tactic[];
  }>({
    past: [],
    future: [],
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Total duration of the tactic (last step offset + 3s margin, min 5s)
  const totalDuration = useMemo(() => {
    return computeTotalDuration(tactic.steps);
  }, [tactic.steps]);

  // Push snapshot to undo stack before mutation
  const pushHistory = useCallback((prevTactic: Tactic) => {
    setHistory((curr) => ({
      past: pushHistoryState(curr.past, prevTactic),
      future: [],
    }));
  }, []);

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

  const undo = useCallback(() => {
    setHistory((curr) => {
      const nextState = undoHistoryState(curr.past, curr.future, tactic);
      if (nextState === null) return curr;

      setTactic(nextState.current);
      return {
        past: nextState.past,
        future: nextState.future,
      };
    });
  }, [tactic]);

  const redo = useCallback(() => {
    setHistory((curr) => {
      const nextState = redoHistoryState(curr.past, curr.future, tactic);
      if (nextState === null) return curr;

      setTactic(nextState.current);
      return {
        past: nextState.past,
        future: nextState.future,
      };
    });
  }, [tactic]);

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
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = updatePlayerPositionAction(step, slot, worldPos);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });
    },
    [activeStepIndex, updateTactic],
  );

  const updatePlayerYaw = useCallback(
    (slot: number, yaw: number) => {
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = updatePlayerYawAction(step, slot, yaw);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });
    },
    [activeStepIndex, updateTactic],
  );

  const updatePlayerLabel = useCallback(
    (slot: number, label: string) => {
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = updatePlayerLabelAction(step, slot, label);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });
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
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const { step: updatedStep, newThrow } = addThrowToStep(step, t, selectedSlot ?? 0);
        createdThrowId = newThrow.id;
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });

      if (createdThrowId !== null) {
        setSelectedThrowId(createdThrowId);
      }
    },
    [activeStepIndex, selectedSlot, updateTactic],
  );

  const updateThrowPosition = useCallback(
    (throwId: string, end: 'from' | 'to', worldPos: { x: number; y: number }) => {
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = updateThrowPositionInStep(step, throwId, end, worldPos);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });
    },
    [activeStepIndex, updateTactic],
  );

  const deleteThrow = useCallback(
    (throwId: string) => {
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = deleteThrowFromStep(step, throwId);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });

      if (selectedThrowId === throwId) {
        setSelectedThrowId(null);
      }
    },
    [activeStepIndex, selectedThrowId, updateTactic],
  );

  // Drawing operations on the active step
  const addDrawingStroke = useCallback(
    (stroke: TacticDrawingStroke | Omit<TacticDrawingStroke, 'id'>) => {
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = addDrawingStrokeToStep(step, stroke);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });
    },
    [activeStepIndex, updateTactic],
  );

  const deleteDrawingStroke = useCallback(
    (strokeIndex: number) => {
      updateTactic((curr) => {
        const step = curr.steps[activeStepIndex];
        if (step === undefined) return curr;

        const updatedStep = deleteDrawingStrokeFromStep(step, strokeIndex);
        const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
        return { ...curr, steps: nextSteps };
      });
    },
    [activeStepIndex, updateTactic],
  );

  const clearDrawings = useCallback(() => {
    updateTactic((curr) => {
      const step = curr.steps[activeStepIndex];
      if (step === undefined) return curr;

      const updatedStep = clearDrawingsFromStep(step);
      const nextSteps = curr.steps.map((s, i) => (i === activeStepIndex ? updatedStep : s));
      return { ...curr, steps: nextSteps };
    });
  }, [activeStepIndex, updateTactic]);

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

  // Playback loop (rAF)
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      } else {
        const deltaSeconds = ((now - lastTimeRef.current) / 1000) * playbackSpeed;
        lastTimeRef.current = now;

        setPlaybackTime((prev) => {
          const next = prev + deltaSeconds;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, totalDuration]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && playbackTime >= totalDuration) {
        setPlaybackTime(0);
      }
      return !prev;
    });
  }, [playbackTime, totalDuration]);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      setPlaybackTime(clamped);
    },
    [totalDuration],
  );

  const jumpStep = useCallback(
    (direction: 'prev' | 'next') => {
      const targetIndex =
        direction === 'prev'
          ? Math.max(0, activeStepIndex - 1)
          : Math.min(tactic.steps.length - 1, activeStepIndex + 1);

      setActiveStepIndex(targetIndex);
      const step = tactic.steps[targetIndex];
      if (step !== undefined) {
        setPlaybackTime(step.timeOffsetSeconds);
      }
    },
    [activeStepIndex, tactic.steps],
  );

  return {
    tactic,
    activeStepIndex,
    activeStep: tactic.steps[activeStepIndex] ?? tactic.steps[0],
    selectedSlot,
    selectedThrowId,
    activeTool,
    pencilColor,
    newThrowKind,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    isPlaying,
    playbackTime,
    playbackSpeed,
    totalDuration,
    setActiveStepIndex,
    setSelectedSlot,
    setSelectedThrowId,
    setActiveTool,
    setPencilColor,
    setNewThrowKind,
    setPlaybackSpeed,
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
    updateThrowPosition,
    deleteThrow,
    addDrawingStroke,
    deleteDrawingStroke,
    clearDrawings,
    updateTitle,
    updateDescription,
    save,
    togglePlay,
    seek,
    jumpStep,
  };
}
