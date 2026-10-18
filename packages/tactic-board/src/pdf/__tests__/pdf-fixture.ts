import type { Tactic, TacticThrow } from '@disa/demo-core';
import { getMapOverview } from '@disa/map-data';
import { createBranch } from '../../helpers/tactic-branches';
import {
  addStepAfter,
  addThrow,
  addWaypoint,
  renameStep,
  setDelay,
  setStepIdea,
  setTask,
  setWeapon,
} from '../../helpers/tactic-edits';
import { addEnemy, newEnemy, setEnemyDead, setEnemyRole } from '../../helpers/tactic-enemy-edits';
import { buildSchedule, type TacticSchedule } from '../../helpers/tactic-schedule';
import { createNewTactic } from '../../helpers/tactic-setup';

const SMOKE: TacticThrow = {
  id: 'throw-smoke',
  throwerSlot: 0,
  kind: 'smoke',
  from: { x: 0, y: 0 },
  to: { x: 0, y: 0 },
  releaseTime: 0,
  notes: 'Window smoke',
};

/**
 * A mirage tactic with two steps in the main plan and a branch that leaves after the first, in
 * which player 2 is out: enough to reach every section the PDF has.
 */
export function sampleTactic(): { tactic: Tactic; rootId: string; branchId: string } {
  let tactic = createNewTactic('de_mirage', 'T');
  const rootId = tactic.plans[0]?.id ?? '';
  const slots = tactic.spawns.length;
  const first = tactic.spawns[0] ?? { x: 0, y: 0 };
  const there = { x: first.x - 600, y: first.y + 200 };

  tactic = addStepAfter(tactic, rootId, 0, slots);
  tactic = renameStep(tactic, { planId: rootId, stepIndex: 0 }, 'Take mid');
  tactic = setStepIdea(tactic, { planId: rootId, stepIndex: 0 }, 'Control mid, then split.');
  tactic = setTask(tactic, { planId: rootId, stepIndex: 0 }, 0, 'Smoke window, hold top mid');
  tactic = setDelay(tactic, { planId: rootId, stepIndex: 0 }, 1, 2);
  tactic = addWaypoint(tactic, { planId: rootId, stepIndex: 0 }, 0, there);
  tactic = addThrow(
    tactic,
    { planId: rootId, stepIndex: 0 },
    {
      ...SMOKE,
      from: there,
      to: { x: there.x - 300, y: there.y + 300 },
    },
  );
  tactic = renameStep(tactic, { planId: rootId, stepIndex: 1 }, '');
  tactic = addEnemy(tactic, { planId: rootId, stepIndex: 1 }, newEnemy({ x: there.x, y: there.y }));
  tactic = setWeapon(tactic, 0, 'AK-47');
  tactic = {
    ...tactic,
    title: 'Mid split',
    author: 'Coach',
    description: 'A default.\nSecond line.',
  };

  const made = createBranch(
    tactic,
    { planId: rootId, stepIndex: 1, deadSlot: 1, condition: 'If player 2 dies' },
    slots,
  );
  if (made === null) throw new Error('the sample branch was not made');
  let withBranch = made.tactic;
  const enemyId = withBranch.plans.find((plan) => plan.id === rootId)?.steps[1]?.enemies?.[0]?.id;
  if (enemyId !== undefined) {
    withBranch = setEnemyRole(withBranch, { planId: rootId, stepIndex: 1 }, enemyId, 'awp');
    withBranch = setEnemyDead(withBranch, { planId: rootId, stepIndex: 1 }, enemyId, true);
  }
  return { tactic: withBranch, rootId, branchId: made.planId };
}

export function schedulesFor(tactic: Tactic): ReadonlyMap<string, TacticSchedule> {
  const overview = getMapOverview(tactic.map);
  if (overview === undefined) throw new Error('mirage overview missing');
  return new Map(
    tactic.plans.map((plan) => [
      plan.id,
      buildSchedule({ overview, grid: undefined, tactic, planId: plan.id }),
    ]),
  );
}

/** A translator that answers with the key and its values, so a test reads what was asked for. */
export function keyTranslate(key: string, values?: Readonly<Record<string, unknown>>): string {
  if (values === undefined) return key;
  const shown = Object.entries(values)
    .map(([name, value]) => `${name}=${String(value)}`)
    .join(',');
  return `${key}(${shown})`;
}

/** Text is 2 mm per 10 characters at 10 pt: coarse, but proportional to size, which is what layout needs. */
export function fakeMeasure(text: string, _font: string, size: number): number {
  return text.length * size * 0.05;
}
