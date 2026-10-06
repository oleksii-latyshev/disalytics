import { canRemoveStep, ownerOf, planById } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapOverview, NavGrid } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { type GraphNodeKey, planGraph } from '../helpers/tactic-plan-graph';
import { planTitle } from '../helpers/tactic-plan-labels';
import { type PlanSchedules, schedulesOfPlans } from '../helpers/tactic-plan-schedules';
import type { TacticSchedule } from '../helpers/tactic-schedule';
import type { useTacticEditor } from './use-tactic-editor';

export interface UseTacticPlansOptions {
  readonly editor: ReturnType<typeof useTacticEditor>;
  readonly overview: MapOverview;
  readonly grid: NavGrid | undefined;
  readonly schedule: TacticSchedule;
  readonly stop: () => void;
}

/** The plan tree as the strip and the tree dialog show it, and what they ask the editor to do. */
export function useTacticPlans({ editor, overview, grid, schedule, stop }: UseTacticPlansOptions) {
  const t = useT();
  const { tactic, planId, stepIndex, selectedSlot } = editor;
  const cache = useRef<PlanSchedules>(new Map());

  const graph = useMemo(() => planGraph(tactic, planId), [tactic, planId]);
  const schedules = useMemo(
    () => schedulesOfPlans(cache.current, { overview, grid, tactic }, { planId, schedule }),
    [overview, grid, tactic, planId, schedule],
  );

  const owner = ownerOf(tactic, planId, stepIndex);
  const selected: GraphNodeKey | null =
    owner === null ? null : { planId: owner.planId, index: stepIndex };

  const plan = planById(tactic, planId);
  const parent = plan?.parentId == null ? undefined : planById(tactic, plan.parentId);
  const titles = {
    root: t('library.tactics.board.branch.root'),
    branch: t('library.tactics.board.branch.unnamed'),
  };
  const nameOf = (id: string) => {
    const found = planById(tactic, id);
    return found === undefined ? '' : planTitle(found, titles);
  };

  const laneStep = (id: string) => {
    const length = graph.lanes.find((lane) => lane.planId === id)?.length ?? 1;
    return Math.max(0, Math.min(stepIndex, length - 1));
  };
  const open = (key: GraphNodeKey) => {
    stop();
    editor.goToPlan(key.planId, key.index);
  };
  const branchAfter = (key: GraphNodeKey) => {
    stop();
    editor.branch({ planId: key.planId, stepIndex: key.index, deadSlot: null, condition: '' });
  };
  const branchFromHere = () => branchAfter({ planId, index: stepIndex });
  const dieHere = (slot: number) => {
    stop();
    editor.branch({
      planId,
      stepIndex,
      deadSlot: slot,
      condition: t('library.tactics.board.branch.diesCondition', { slot: slot + 1 }),
    });
  };
  const deleteBlockOf = (key: GraphNodeKey): string | null => {
    const check = canRemoveStep(tactic, key.planId, key.index);
    if (check.ok) return null;
    return check.reason === 'fork-point'
      ? t('library.tactics.board.step.deleteFork')
      : t('library.tactics.board.step.deleteOnly');
  };

  return {
    graph,
    schedules,
    selected,
    isBranch: plan !== undefined && plan.parentId !== null,
    condition: plan?.condition ?? '',
    forkNumber: (plan?.forkAfter ?? 0) + 1,
    parentName: parent === undefined ? '' : nameOf(parent.id),
    sharedOwnerName: owner !== null && owner.planId !== planId ? nameOf(owner.planId) : null,
    diesSlot: selectedSlot,
    open,
    openLane: (id: string) => open({ planId: id, index: laneStep(id) }),
    branchAfter,
    branchFromHere,
    dieHere,
    deleteBlockOf,
    addStep: (id: string) => {
      stop();
      editor.appendStep(id);
    },
    deleteStep: (key: GraphNodeKey) => {
      stop();
      editor.deleteStepAt(key.planId, key.index);
    },
    deletePlan: (id: string) => {
      stop();
      editor.deletePlan(id);
    },
  };
}
