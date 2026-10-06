import {
  effectiveSteps,
  type Tactic,
  type TacticEnemy,
  type TacticEnemyRole,
  type TacticPoint,
  type TacticRound,
  type TacticRouteMode,
  type TacticSide,
  type TacticThrow,
} from '@disa/demo-core';
import { useCallback, useMemo, useReducer } from 'react';
import { type BranchRequest, setCondition } from '../helpers/tactic-branches';
import {
  editorReducer,
  initialEditorState,
  type TacticTool,
  type ThrowKind,
} from '../helpers/tactic-editor-state';
import * as edits from '../helpers/tactic-edits';
import * as enemyEdits from '../helpers/tactic-enemy-edits';
import { changeTacticMap, changeTacticSide, toggleTacticRound } from '../helpers/tactic-setup';

export type { TacticTool, ThrowKind };

export interface UseTacticEditorOptions {
  readonly initialTactic: Tactic;
  readonly onSave?: ((tactic: Tactic) => void | Promise<void>) | undefined;
}

export function useTacticEditor({ initialTactic, onSave }: UseTacticEditorOptions) {
  const [state, dispatch] = useReducer(editorReducer, initialTactic, initialEditorState);
  const { present: tactic } = state.history;
  const { planId, stepIndex } = state;

  const steps = useMemo(() => effectiveSteps(tactic, planId), [tactic, planId]);
  const step = steps[stepIndex] ?? steps[0];

  const edit = useCallback(
    (update: (tactic: Tactic, at: edits.StepAddress) => Tactic, gesture?: string) =>
      dispatch({ type: 'edit', update, gesture }),
    [],
  );
  const endGesture = useCallback(() => dispatch({ type: 'endGesture' }), []);

  const actions = useMemo(
    () => ({
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      replaceTactic: (next: Tactic) => dispatch({ type: 'replace', tactic: next }),
      goToStep: (index: number) => dispatch({ type: 'goToStep', index }),
      goToPlan: (target: string, index: number) =>
        dispatch({ type: 'goToPlan', planId: target, index }),
      addStep: () => dispatch({ type: 'addStep' }),
      appendStep: (target: string) => dispatch({ type: 'appendStep', planId: target }),
      deleteStep: () => dispatch({ type: 'deleteStep' }),
      deleteStepAt: (target: string, index: number) =>
        dispatch({ type: 'deleteStepAt', planId: target, index }),
      deletePlan: (target: string) => dispatch({ type: 'deletePlan', planId: target }),
      branch: (request: BranchRequest) => dispatch({ type: 'branch', request }),
      conditionSeen: () => dispatch({ type: 'conditionSeen' }),
      setCondition: (text: string) =>
        edit((t) => setCondition(t, planId, text), `condition:${planId}`),
      select: (slot: number | null) => dispatch({ type: 'select', slot }),
      selectEnemy: (id: string | null) => dispatch({ type: 'selectEnemy', id }),
      setTool: (tool: TacticTool) => dispatch({ type: 'tool', tool }),
      setThrowKind: (kind: ThrowKind) => dispatch({ type: 'throwKind', kind }),
      endGesture,
      rename: (name: string) => edit((t, at) => edits.renameStep(t, at, name), `name:${stepIndex}`),
      setIdea: (idea: string) =>
        edit((t, at) => edits.setStepIdea(t, at, idea), `idea:${stepIndex}`),
      setStart: (startsAt: number | null) => edit((t, at) => edits.setStepStart(t, at, startsAt)),
      setTask: (slot: number, task: string) =>
        edit((t, at) => edits.setTask(t, at, slot, task), `task:${stepIndex}:${slot}`),
      setDelay: (slot: number, seconds: number) =>
        edit((t, at) => edits.setDelay(t, at, slot, seconds)),
      addWaypoint: (slot: number, point: TacticPoint) =>
        edit((t, at) => edits.addWaypoint(t, at, slot, point)),
      moveWaypoint: (slot: number, index: number, point: TacticPoint) =>
        edit(
          (t, at) => edits.moveWaypoint(t, at, slot, index, point),
          `move:${stepIndex}:${slot}:${index}`,
        ),
      removeWaypoint: (slot: number, index?: number) =>
        edit((t, at) => edits.removeWaypoint(t, at, slot, index)),
      clearRoute: (slot: number) => edit((t, at) => edits.clearRoute(t, at, slot)),
      setPenRoute: (slot: number, points: readonly TacticPoint[]) =>
        edit((t, at) => edits.setPenRoute(t, at, slot, points)),
      setRouteMode: (slot: number, mode: TacticRouteMode) =>
        edit((t, at) => edits.setRouteMode(t, at, slot, mode)),
      addThrow: (thrown: TacticThrow) => edit((t, at) => edits.addThrow(t, at, thrown)),
      addLineupThrow: (thrown: TacticThrow, origin: TacticPoint) =>
        edit((t, at) => edits.addLineupThrow(t, at, thrown, origin)),
      removeThrow: (throwId: string) => edit((t, at) => edits.removeThrow(t, at, throwId)),
      setSpawn: (slot: number, point: TacticPoint) => edit((t) => edits.setSpawn(t, slot, point)),
      addEnemy: (enemy: TacticEnemy) => edit((t, at) => enemyEdits.addEnemy(t, at, enemy)),
      removeEnemy: (id: string) => edit((t, at) => enemyEdits.removeEnemy(t, at, id)),
      moveEnemy: (id: string, point: TacticPoint) =>
        edit((t, at) => enemyEdits.moveEnemy(t, at, id, point), `enemy-move:${stepIndex}:${id}`),
      setEnemyNote: (id: string, note: string) =>
        edit((t, at) => enemyEdits.setEnemyNote(t, at, id, note), `enemy-note:${stepIndex}:${id}`),
      setEnemyRole: (id: string, role: TacticEnemyRole) =>
        edit((t, at) => enemyEdits.setEnemyRole(t, at, id, role)),
      setEnemyTaker: (id: string, slot: number | null) =>
        edit((t, at) => enemyEdits.setEnemyTaker(t, at, id, slot)),
      setEnemyDead: (id: string, isDead: boolean) =>
        edit((t, at) => enemyEdits.setEnemyDead(t, at, id, isDead)),
      changeMap: (map: string) => edit((t) => changeTacticMap(t, map)),
      changeSide: (side: TacticSide) => edit((t) => changeTacticSide(t, side)),
      toggleRound: (round: TacticRound) => edit((t) => toggleTacticRound(t, round)),
      updateTitle: (title: string) => edit((t) => ({ ...t, title }), 'title'),
      updateDescription: (description: string) =>
        edit((t) => ({ ...t, description }), 'description'),
    }),
    [edit, endGesture, planId, stepIndex],
  );

  const save = useCallback(() => {
    void onSave?.(tactic);
  }, [onSave, tactic]);

  return {
    tactic,
    planId,
    stepIndex,
    conditionFocus: state.conditionFocus,
    steps,
    step,
    selectedSlot: state.selectedSlot,
    selectedEnemyId: state.selectedEnemyId,
    tool: state.tool,
    throwKind: state.throwKind,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    save,
    ...actions,
  };
}
