import type { TacticDrawingStroke, TacticThrow } from '@disa/demo-core';
import type { EditorStep, EditorTactic } from './editor-tactic';

export const MAX_HISTORY = 30;

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function computeTotalDuration(steps: readonly EditorStep[]): number {
  if (steps.length === 0) return 5;
  const lastStep = steps[steps.length - 1];
  const maxOffset = lastStep !== undefined ? lastStep.timeOffsetSeconds : 0;
  return Math.max(5, maxOffset + 3);
}

export function addStep(tactic: EditorTactic): {
  readonly tactic: EditorTactic;
  readonly newIndex: number;
} {
  const lastStep = tactic.steps[tactic.steps.length - 1];
  const nextOffset = (lastStep?.timeOffsetSeconds ?? 0) + 5;
  const newStep: EditorStep = {
    id: generateId('step'),
    name: '',
    timeOffsetSeconds: nextOffset,
    players: lastStep?.players ?? [],
    throws: [],
    drawings: [],
  };

  const nextSteps = [...tactic.steps, newStep];
  return {
    tactic: { ...tactic, steps: nextSteps, updatedAt: Date.now() },
    newIndex: nextSteps.length - 1,
  };
}

export function duplicateStep(
  tactic: EditorTactic,
  index: number,
): { readonly tactic: EditorTactic; readonly newIndex: number } {
  const source = tactic.steps[index];
  if (source === undefined) {
    return { tactic, newIndex: index };
  }

  const duplicated: EditorStep = {
    ...source,
    id: generateId('step'),
    name: source.name,
    timeOffsetSeconds: source.timeOffsetSeconds + 2,
    throws: source.throws.map((thrown) => ({ ...thrown, id: generateId('throw') })),
  };

  const nextSteps = [
    ...tactic.steps.slice(0, index + 1),
    duplicated,
    ...tactic.steps.slice(index + 1),
  ];
  return {
    tactic: { ...tactic, steps: nextSteps, updatedAt: Date.now() },
    newIndex: index + 1,
  };
}

export function deleteStep(
  tactic: EditorTactic,
  index: number,
  currentActiveIndex: number,
): { readonly tactic: EditorTactic; readonly newIndex: number } {
  if (tactic.steps.length <= 1) {
    return { tactic, newIndex: currentActiveIndex };
  }

  const nextSteps = tactic.steps.filter((_, i) => i !== index);
  const newIndex = Math.min(currentActiveIndex, nextSteps.length - 1);
  return {
    tactic: { ...tactic, steps: nextSteps, updatedAt: Date.now() },
    newIndex,
  };
}

export function moveStep(
  tactic: EditorTactic,
  index: number,
  direction: 'earlier' | 'later',
): { readonly tactic: EditorTactic; readonly newIndex: number } {
  const targetIndex = direction === 'earlier' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= tactic.steps.length) {
    return { tactic, newIndex: index };
  }

  const nextSteps = [...tactic.steps];
  const currentStep = nextSteps[index];
  const targetStep = nextSteps[targetIndex];
  if (currentStep === undefined || targetStep === undefined) {
    return { tactic, newIndex: index };
  }

  nextSteps[index] = targetStep;
  nextSteps[targetIndex] = currentStep;

  return {
    tactic: { ...tactic, steps: nextSteps, updatedAt: Date.now() },
    newIndex: targetIndex,
  };
}

export function updateStepName(tactic: EditorTactic, index: number, name: string): EditorTactic {
  const nextSteps = tactic.steps.map((s, i) => (i === index ? { ...s, name } : s));
  return { ...tactic, steps: nextSteps, updatedAt: Date.now() };
}

export function updateStepOffset(
  tactic: EditorTactic,
  index: number,
  timeOffsetSeconds: number,
): EditorTactic {
  const nextSteps = tactic.steps.map((s, i) =>
    i === index ? { ...s, timeOffsetSeconds: Math.max(0, timeOffsetSeconds) } : s,
  );
  return { ...tactic, steps: nextSteps, updatedAt: Date.now() };
}

export function updateStepNotes(tactic: EditorTactic, index: number, notes: string): EditorTactic {
  const nextSteps = tactic.steps.map((s, i) => (i === index ? { ...s, notes } : s));
  return { ...tactic, steps: nextSteps, updatedAt: Date.now() };
}

export function updatePlayerPosition(
  step: EditorStep,
  slot: number,
  worldPos: { x: number; y: number },
): EditorStep {
  let found = false;
  const nextPlayers = step.players.map((p) => {
    if (p.slot === slot) {
      found = true;
      return { ...p, x: Math.round(worldPos.x), y: Math.round(worldPos.y) };
    }
    return p;
  });

  if (!found) {
    nextPlayers.push({
      slot,
      x: Math.round(worldPos.x),
      y: Math.round(worldPos.y),
    });
  }

  return { ...step, players: nextPlayers };
}

export function updatePlayerYaw(step: EditorStep, slot: number, yaw: number): EditorStep {
  const nextPlayers = step.players.map((p) => (p.slot === slot ? { ...p, yaw } : p));
  return { ...step, players: nextPlayers };
}

export function updatePlayerLabel(step: EditorStep, slot: number, label: string): EditorStep {
  const nextPlayers = step.players.map((p) => (p.slot === slot ? { ...p, label } : p));
  return { ...step, players: nextPlayers };
}

export function addThrowToStep(
  step: EditorStep,
  throwData: Partial<TacticThrow> & Pick<TacticThrow, 'kind' | 'from' | 'to'>,
  fallbackSlot = 0,
): { readonly step: EditorStep; readonly newThrow: TacticThrow } {
  const newThrow: TacticThrow = {
    throwerSlot: throwData.throwerSlot ?? fallbackSlot,
    releaseTime: throwData.releaseTime ?? 0,
    ...throwData,
    id: generateId('throw'),
  };

  return {
    step: { ...step, throws: [...step.throws, newThrow] },
    newThrow,
  };
}

export function updateThrowPositionInStep(
  step: EditorStep,
  throwId: string,
  end: 'from' | 'to',
  worldPos: { x: number; y: number },
): EditorStep {
  const nextThrows = step.throws.map((t) => {
    if (t.id !== throwId) return t;
    return {
      ...t,
      [end]: { x: Math.round(worldPos.x), y: Math.round(worldPos.y) },
    };
  });
  return { ...step, throws: nextThrows };
}

/** Names the teammate who buys and drops this throw's grenade, or clears it with `undefined`. */
export function updateThrowDroppedBy(
  step: EditorStep,
  throwId: string,
  droppedBy: number | undefined,
): EditorStep {
  const nextThrows = step.throws.map((t) => {
    if (t.id !== throwId) return t;
    const { droppedBy: _previous, ...rest } = t;
    return droppedBy === undefined ? rest : { ...rest, droppedBy };
  });
  return { ...step, throws: nextThrows };
}

export function deleteThrowFromStep(step: EditorStep, throwId: string): EditorStep {
  const nextThrows = step.throws.filter((t) => t.id !== throwId);
  return { ...step, throws: nextThrows };
}

export function addDrawingStrokeToStep(
  step: EditorStep,
  stroke: TacticDrawingStroke | Omit<TacticDrawingStroke, 'id'>,
): EditorStep {
  const newStroke: TacticDrawingStroke = {
    id: 'id' in stroke && stroke.id ? stroke.id : generateId('stroke'),
    ...stroke,
  };
  return {
    ...step,
    drawings: [...(step.drawings ?? []), newStroke],
  };
}

export function deleteDrawingStrokeFromStep(step: EditorStep, index: number): EditorStep {
  const nextDrawings = (step.drawings ?? []).filter((_, i) => i !== index);
  return { ...step, drawings: nextDrawings };
}

export function clearDrawingsFromStep(step: EditorStep): EditorStep {
  return { ...step, drawings: [] };
}

export function pushHistoryState<T>(
  past: readonly T[],
  current: T,
  maxHistory = MAX_HISTORY,
): readonly T[] {
  const nextPast = [...past, current];
  if (nextPast.length > maxHistory) {
    nextPast.shift();
  }
  return nextPast;
}

export function undoHistoryState<T>(
  past: readonly T[],
  future: readonly T[],
  current: T,
): {
  readonly past: readonly T[];
  readonly future: readonly T[];
  readonly current: T;
} | null {
  if (past.length === 0) return null;
  const previous = past[past.length - 1];
  if (previous === undefined) return null;

  return {
    past: past.slice(0, -1),
    future: [current, ...future],
    current: previous,
  };
}

export function redoHistoryState<T>(
  past: readonly T[],
  future: readonly T[],
  current: T,
): {
  readonly past: readonly T[];
  readonly future: readonly T[];
  readonly current: T;
} | null {
  if (future.length === 0) return null;
  const next = future[0];
  if (next === undefined) return null;

  return {
    past: [...past, current],
    future: future.slice(1),
    current: next,
  };
}
