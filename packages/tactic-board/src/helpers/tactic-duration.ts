import { rootPlan, type Tactic } from '@disa/demo-core';
import { getMapOverview } from '@disa/map-data';
import { buildSchedule } from './tactic-schedule';

/**
 * How long the main plan runs, in whole seconds, with every route taken as the straight line
 * between its points: a library card does not load the map's walkable grid.
 */
export function tacticDurationSeconds(tactic: Tactic): number {
  const overview = getMapOverview(tactic.map);
  const root = rootPlan(tactic);
  if (overview === undefined || root === undefined) return 0;
  const schedule = buildSchedule({ overview, grid: undefined, tactic, planId: root.id });
  return Math.round(schedule.totalSeconds);
}
