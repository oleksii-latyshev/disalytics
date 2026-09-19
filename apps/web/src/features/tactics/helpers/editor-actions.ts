import type {
  Tactic,
  TacticDrawingStroke,
  TacticSide,
  TacticStep,
  TacticThrow,
} from '@disa/demo-core';

export const MAX_HISTORY = 30;

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function computeTotalDuration(steps: readonly TacticStep[]): number {
  if (steps.length === 0) return 5;
  const lastStep = steps[steps.length - 1];
  const maxOffset = lastStep !== undefined ? lastStep.timeOffsetSeconds : 0;
  return Math.max(5, maxOffset + 3);
}

export function addStep(tactic: Tactic): { readonly tactic: Tactic; readonly newIndex: number } {
  const lastStep = tactic.steps[tactic.steps.length - 1];
  const nextOffset = (lastStep?.timeOffsetSeconds ?? 0) + 5;
  const newStep: TacticStep = {
    id: generateId('step'),
    name: `Step ${tactic.steps.length + 1}`,
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
  tactic: Tactic,
  index: number,
): { readonly tactic: Tactic; readonly newIndex: number } {
  const source = tactic.steps[index];
  if (source === undefined) {
    return { tactic, newIndex: index };
  }

  const duplicated: TacticStep = {
    ...source,
    id: generateId('step'),
    name: `${source.name} (Copy)`,
    timeOffsetSeconds: source.timeOffsetSeconds + 2,
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
  tactic: Tactic,
  index: number,
  currentActiveIndex: number,
): { readonly tactic: Tactic; readonly newIndex: number } {
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
  tactic: Tactic,
  index: number,
  direction: 'earlier' | 'later',
): { readonly tactic: Tactic; readonly newIndex: number } {
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

export function updateStepName(tactic: Tactic, index: number, name: string): Tactic {
  const nextSteps = tactic.steps.map((s, i) => (i === index ? { ...s, name } : s));
  return { ...tactic, steps: nextSteps, updatedAt: Date.now() };
}

export function updateStepOffset(tactic: Tactic, index: number, timeOffsetSeconds: number): Tactic {
  const nextSteps = tactic.steps.map((s, i) =>
    i === index ? { ...s, timeOffsetSeconds: Math.max(0, timeOffsetSeconds) } : s,
  );
  return { ...tactic, steps: nextSteps, updatedAt: Date.now() };
}

export function updateStepNotes(tactic: Tactic, index: number, notes: string): Tactic {
  const nextSteps = tactic.steps.map((s, i) => (i === index ? { ...s, notes } : s));
  return { ...tactic, steps: nextSteps, updatedAt: Date.now() };
}

export function updatePlayerPosition(
  step: TacticStep,
  slot: number,
  worldPos: { x: number; y: number },
): TacticStep {
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

export function updatePlayerYaw(step: TacticStep, slot: number, yaw: number): TacticStep {
  const nextPlayers = step.players.map((p) => (p.slot === slot ? { ...p, yaw } : p));
  return { ...step, players: nextPlayers };
}

export function updatePlayerLabel(step: TacticStep, slot: number, label: string): TacticStep {
  const nextPlayers = step.players.map((p) => (p.slot === slot ? { ...p, label } : p));
  return { ...step, players: nextPlayers };
}

export function addThrowToStep(
  step: TacticStep,
  throwData: Partial<TacticThrow> & Pick<TacticThrow, 'kind' | 'from' | 'to'>,
  fallbackSlot = 0,
): { readonly step: TacticStep; readonly newThrow: TacticThrow } {
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
  step: TacticStep,
  throwId: string,
  end: 'from' | 'to',
  worldPos: { x: number; y: number },
): TacticStep {
  const nextThrows = step.throws.map((t) => {
    if (t.id !== throwId) return t;
    return {
      ...t,
      [end]: { x: Math.round(worldPos.x), y: Math.round(worldPos.y) },
    };
  });
  return { ...step, throws: nextThrows };
}

export function deleteThrowFromStep(step: TacticStep, throwId: string): TacticStep {
  const nextThrows = step.throws.filter((t) => t.id !== throwId);
  return { ...step, throws: nextThrows };
}

export function addDrawingStrokeToStep(
  step: TacticStep,
  stroke: TacticDrawingStroke | Omit<TacticDrawingStroke, 'id'>,
): TacticStep {
  const newStroke: TacticDrawingStroke = {
    id: 'id' in stroke && stroke.id ? stroke.id : generateId('stroke'),
    ...stroke,
  };
  return {
    ...step,
    drawings: [...(step.drawings ?? []), newStroke],
  };
}

export function deleteDrawingStrokeFromStep(step: TacticStep, index: number): TacticStep {
  const nextDrawings = (step.drawings ?? []).filter((_, i) => i !== index);
  return { ...step, drawings: nextDrawings };
}

export function clearDrawingsFromStep(step: TacticStep): TacticStep {
  return { ...step, drawings: [] };
}

export function pushHistoryState(
  past: readonly Tactic[],
  current: Tactic,
  maxHistory = MAX_HISTORY,
): readonly Tactic[] {
  const nextPast = [...past, current];
  if (nextPast.length > maxHistory) {
    nextPast.shift();
  }
  return nextPast;
}

export function undoHistoryState(
  past: readonly Tactic[],
  future: readonly Tactic[],
  current: Tactic,
): {
  readonly past: readonly Tactic[];
  readonly future: readonly Tactic[];
  readonly current: Tactic;
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

export function redoHistoryState(
  past: readonly Tactic[],
  future: readonly Tactic[],
  current: Tactic,
): {
  readonly past: readonly Tactic[];
  readonly future: readonly Tactic[];
  readonly current: Tactic;
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

export function createNewTactic(
  map = 'de_mirage',
  side: TacticSide = 'T',
  title = 'New Tactic',
): Tactic {
  const now = Date.now();
  return {
    id: generateId('tactic'),
    title,
    map,
    side,
    createdAt: now,
    updatedAt: now,
    steps: [
      {
        id: generateId('step'),
        name: 'Step 1',
        timeOffsetSeconds: 0,
        players: [
          { slot: 0, x: -1000, y: -1000, yaw: 0, label: 'Player 1' },
          { slot: 1, x: -1100, y: -1000, yaw: 0, label: 'Player 2' },
          { slot: 2, x: -1200, y: -1000, yaw: 0, label: 'Player 3' },
          { slot: 3, x: -1300, y: -1000, yaw: 0, label: 'Player 4' },
          { slot: 4, x: -1400, y: -1000, yaw: 0, label: 'Player 5' },
        ],
        throws: [],
        drawings: [],
      },
    ],
  };
}
