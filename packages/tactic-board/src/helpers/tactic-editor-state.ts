import {
  canRemoveStep,
  effectiveSteps,
  insertStep,
  planById,
  removePlan,
  rootPlan,
  type Tactic,
  type UtilityKind,
} from '@disa/demo-core';
import { type BranchRequest, createBranch, survivingPlanId } from './tactic-branches';
import { addStepAfter, deleteStep, newStep, type StepAddress } from './tactic-edits';
import {
  applyEdit,
  endGesture,
  redo,
  startHistory,
  type TacticHistory,
  undo,
} from './tactic-history';

export type TacticTool = 'select' | 'route' | 'pen' | 'grenade' | 'enemy';

export type ThrowKind = Extract<UtilityKind, 'smoke' | 'flash' | 'fire' | 'he'>;

export const THROW_KINDS: readonly ThrowKind[] = ['smoke', 'flash', 'fire', 'he'] as const;

export interface EditorState {
  readonly history: TacticHistory;
  /** The plan being edited; the steps shown are its effective steps. */
  readonly planId: string;
  /** A branch just made, whose condition field takes focus once. */
  readonly conditionFocus: string | null;
  readonly stepIndex: number;
  readonly selectedSlot: number | null;
  /** An expected enemy of the step in view; only one of a player and an enemy is picked at a time. */
  readonly selectedEnemyId: string | null;
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
  | { readonly type: 'goToPlan'; readonly planId: string; readonly index: number }
  | { readonly type: 'addStep' }
  | { readonly type: 'appendStep'; readonly planId: string }
  | { readonly type: 'deleteStep' }
  | { readonly type: 'deleteStepAt'; readonly planId: string; readonly index: number }
  | { readonly type: 'deletePlan'; readonly planId: string }
  | { readonly type: 'branch'; readonly request: BranchRequest }
  | { readonly type: 'conditionSeen' }
  | { readonly type: 'select'; readonly slot: number | null }
  | { readonly type: 'selectEnemy'; readonly id: string | null }
  | { readonly type: 'tool'; readonly tool: TacticTool }
  | { readonly type: 'throwKind'; readonly kind: ThrowKind };

export function initialEditorState(tactic: Tactic): EditorState {
  return {
    history: startHistory(tactic),
    planId: rootPlan(tactic)?.id ?? '',
    conditionFocus: null,
    stepIndex: 0,
    selectedSlot: 0,
    selectedEnemyId: null,
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

/** Takes the history on, moving to the nearest plan still there when the one in view is gone. */
function withHistory(state: EditorState, history: TacticHistory): EditorState {
  const planId = survivingPlanId(state.history.present, history.present, state.planId);
  const fallback = rootPlan(history.present)?.id ?? state.planId;
  return clampStep({ ...state, history, planId: planId ?? fallback });
}

/** Opens `planId` at its step `index`, held to the steps the plan has. */
function goToPlan(state: EditorState, planId: string, index: number): EditorState {
  const { present } = state.history;
  if (planById(present, planId) === undefined) return state;
  const count = effectiveSteps(present, planId).length;
  return {
    ...state,
    planId,
    conditionFocus: null,
    stepIndex: Math.max(0, Math.min(index, count - 1)),
  };
}

/** A new step at the end of `planId`, opened. */
function appendStepTo(state: EditorState, planId: string): EditorState {
  const { present } = state.history;
  const count = effectiveSteps(present, planId).length;
  if (count === 0) return state;
  const next = insertStep(present, planId, count, newStep(present.spawns.length));
  return {
    ...state,
    planId,
    conditionFocus: null,
    history: applyEdit(state.history, next, null),
    stepIndex: count,
  };
}

/** A new branch, opened on its first own step with its condition field asking to be filled. */
function branchFrom(state: EditorState, request: BranchRequest): EditorState {
  const { present } = state.history;
  const made = createBranch(present, request, present.spawns.length);
  if (made === null) return state;
  return {
    ...state,
    history: applyEdit(state.history, made.tactic, null),
    planId: made.planId,
    stepIndex: made.stepIndex,
    conditionFocus: made.planId,
  };
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
    case 'goToPlan':
      return goToPlan(state, action.planId, action.index);
    case 'appendStep':
      return appendStepTo(state, action.planId);
    case 'branch':
      return branchFrom(state, action.request);
    case 'conditionSeen':
      return state.conditionFocus === null ? state : { ...state, conditionFocus: null };
    case 'deleteStepAt': {
      if (!canRemoveStep(present, action.planId, action.index).ok) return state;
      const next = deleteStep(present, action.planId, action.index);
      return withHistory(state, applyEdit(state.history, next, null));
    }
    case 'deletePlan': {
      const next = removePlan(present, action.planId);
      return withHistory(state, applyEdit(state.history, next, null));
    }
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
      return {
        ...state,
        selectedSlot: action.slot,
        selectedEnemyId: action.slot === null ? state.selectedEnemyId : null,
      };
    case 'selectEnemy':
      return {
        ...state,
        selectedEnemyId: action.id,
        selectedSlot: action.id === null ? state.selectedSlot : null,
      };
    case 'tool':
      return { ...state, tool: action.tool };
    case 'throwKind':
      return { ...state, throwKind: action.kind, tool: 'grenade' };
  }
}
