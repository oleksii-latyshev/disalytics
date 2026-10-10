import type { Tactic, TacticPlan } from '@disa/demo-core';
import { planById } from '@disa/demo-core';
import { buildSchedule, type ScheduleInput, type TacticSchedule } from './tactic-schedule';

interface Entry {
  readonly inputs: readonly unknown[];
  readonly schedule: TacticSchedule;
}

/** What a plan's schedule depends on: the map inputs and every plan from the root down to it. */
function inputsOf(input: ScheduleInput, planId: string): readonly unknown[] {
  const chain: TacticPlan[] = [];
  for (let plan = planById(input.tactic, planId); plan !== undefined; ) {
    chain.unshift(plan);
    plan = plan.parentId === null ? undefined : planById(input.tactic, plan.parentId);
  }
  return [input.overview, input.grid, input.tactic.spawns, ...chain];
}

function isSame(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

export type PlanSchedules = Map<string, Entry>;

/**
 * The schedule of every plan, for the clocks on the strip and the tree. An edit rewrites only the
 * plans it touches (an edited plan and the branches below it), so the rest keep the schedule they had.
 */
export function schedulesOfPlans(
  cache: PlanSchedules,
  input: Omit<ScheduleInput, 'planId'>,
  current: { readonly planId: string; readonly schedule: TacticSchedule },
): ReadonlyMap<string, TacticSchedule> {
  const result = new Map<string, TacticSchedule>();
  const tactic: Tactic = input.tactic;
  for (const plan of tactic.plans) {
    const full = { ...input, planId: plan.id };
    const inputs = inputsOf(full, plan.id);
    const known = cache.get(plan.id);
    const schedule =
      known !== undefined && isSame(known.inputs, inputs)
        ? known.schedule
        : plan.id === current.planId
          ? current.schedule
          : buildSchedule(full);
    cache.set(plan.id, { inputs, schedule });
    result.set(plan.id, schedule);
  }
  for (const id of [...cache.keys()]) if (!result.has(id)) cache.delete(id);
  return result;
}
