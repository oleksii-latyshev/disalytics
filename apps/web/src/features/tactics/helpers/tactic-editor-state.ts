import {
  canRemoveStep,
  effectiveSteps,
  rootPlan,
  type Tactic,
  type UtilityKind,
} from '@disa/demo-core';
import { addStepAfter, deleteStep, type StepAddress } from './tactic-edits';
import {
  applyEdit,
  endGesture,
  redo,
  startHistory,
  type TacticHistory,
  undo,
} from './tactic-history';

/** Tools of the map. The enemy tool of the expected-enemies work takes its slot here. */
export type TacticTool = 'select' | 'route' | 'pen' | 'grenade';

export type ThrowKind = Extract<UtilityKind, 'smoke' | 'flash' | 'fire' | 'he'>;

export const THROW_KINDS: readonly ThrowKind[] = ['smoke', 'flash', 'fire', 'he'] as const;

export interface EditorState {
  readonly history: TacticHistory;
  /** The plan being edited; only the root can be chosen until branches can. */
  readonly planId: string;
  readonly stepIndex: number;
  readonly selectedSlot: number | null;
  readonly tool: TacticTool;
  readonly throwKind: ThrowKind;
}

export type EditorAction =
  | {
      readonly type: 'edit';
      readonly update: (tactic: Tactic, at: StepAddress) => Tactic;
      readonly gesture?: string | undefined;
    }
  | { readonly type: 'endGesture' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'replace'; readonly tactic: Tactic }
  | { readonly type: 'goToStep'; readonly index: number }
  | { readonly type: 'addStep' }
  | { readonly type: 'deleteStep' }
  | { readonly type: 'select'; readonly slot: number | null }
  | { readonly type: 'tool'; readonly tool: TacticTool }
  | { readonly type: 'throwKind'; readonly kind: ThrowKind };

export function initialEditorState(tactic: Tactic): EditorState {
  return {
    history: startHistory(tactic),
    planId: rootPlan(tactic)?.id ?? '',
    stepIndex: 0,
    selectedSlot: 0,
    tool: 'route',
    throwKind: 'smoke',
  };
}

export function stepCountOf(state: EditorState): number {
  return effectiveSteps(state.history.present, state.planId).length;
}

function clampStep(state: EditorState): EditorState {
  const last = Math.max(0, stepCountOf(state) - 1);
  return state.stepIndex > last ? { ...state, stepIndex: last } : state;
}

function withHistory(state: EditorState, history: TacticHistory): EditorState {
  return clampStep({ ...state, history });
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { present } = state.history;
  const at: StepAddress = { planId: state.planId, stepIndex: state.stepIndex };

  switch (action.type) {
    case 'edit':
      return withHistory(
        state,
        applyEdit(state.history, action.update(present, at), action.gesture ?? null),
      );
    case 'endGesture':
      return { ...state, history: endGesture(state.history) };
    case 'undo':
      return withHistory(state, undo(state.history));
    case 'redo':
      return withHistory(state, redo(state.history));
    case 'replace':
      return { ...initialEditorState(action.tactic), tool: state.tool, throwKind: state.throwKind };
    case 'goToStep':
      return { ...state, stepIndex: Math.max(0, Math.min(action.index, stepCountOf(state) - 1)) };
    case 'addStep': {
      const next = addStepAfter(present, state.planId, state.stepIndex, present.spawns.length);
      return {
        ...state,
        history: applyEdit(state.history, next, null),
        stepIndex: state.stepIndex + 1,
      };
    }
    case 'deleteStep': {
      if (!canRemoveStep(present, state.planId, state.stepIndex).ok) return state;
      const next = deleteStep(present, state.planId, state.stepIndex);
      return withHistory(state, applyEdit(state.history, next, null));
    }
    case 'select':
      return { ...state, selectedSlot: action.slot };
    case 'tool':
      return { ...state, tool: action.tool };
    case 'throwKind':
      return { ...state, throwKind: action.kind, tool: 'grenade' };
  }
}
