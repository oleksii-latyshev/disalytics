import type { Tactic, TacticEnemy, TacticEnemyRole, TacticPoint } from '@disa/demo-core';
import { editStep, type StepAddress } from './tactic-edits';
import { generateId } from './tactic-ids';

function editEnemy(
  tactic: Tactic,
  at: StepAddress,
  id: string,
  update: (enemy: TacticEnemy) => TacticEnemy,
): Tactic {
  return editStep(tactic, at, (step) => ({
    ...step,
    enemies: (step.enemies ?? []).map((enemy) => (enemy.id === id ? update(enemy) : enemy)),
  }));
}

export function newEnemy(at: TacticPoint): TacticEnemy {
  return { id: generateId('enemy'), at };
}

export function addEnemy(tactic: Tactic, at: StepAddress, enemy: TacticEnemy): Tactic {
  return editStep(tactic, at, (step) => ({ ...step, enemies: [...(step.enemies ?? []), enemy] }));
}

export function removeEnemy(tactic: Tactic, at: StepAddress, id: string): Tactic {
  return editStep(tactic, at, (step) => ({
    ...step,
    enemies: (step.enemies ?? []).filter((enemy) => enemy.id !== id),
  }));
}

export function moveEnemy(tactic: Tactic, at: StepAddress, id: string, point: TacticPoint): Tactic {
  return editEnemy(tactic, at, id, (enemy) => ({ ...enemy, at: point }));
}

export function setEnemyNote(tactic: Tactic, at: StepAddress, id: string, note: string): Tactic {
  return editEnemy(tactic, at, id, (enemy) => ({ ...enemy, note: note === '' ? undefined : note }));
}

/** Picking the role that is already set clears it. */
export function setEnemyRole(
  tactic: Tactic,
  at: StepAddress,
  id: string,
  role: TacticEnemyRole,
): Tactic {
  return editEnemy(tactic, at, id, (enemy) => ({
    ...enemy,
    role: enemy.role === role ? undefined : role,
  }));
}

/** Who of ours takes this enemy; `null` for nobody. */
export function setEnemyTaker(
  tactic: Tactic,
  at: StepAddress,
  id: string,
  slot: number | null,
): Tactic {
  return editEnemy(tactic, at, id, (enemy) => ({ ...enemy, killedBy: slot ?? undefined }));
}

export function setEnemyDead(tactic: Tactic, at: StepAddress, id: string, isDead: boolean): Tactic {
  return editEnemy(tactic, at, id, (enemy) => ({ ...enemy, isDead: isDead ? true : undefined }));
}
