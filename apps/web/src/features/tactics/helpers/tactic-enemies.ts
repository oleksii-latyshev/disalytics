import type { TacticEnemy, TacticEnemyRole, TacticSide, TacticStep } from '@disa/demo-core';

const NO_ENEMIES: readonly TacticEnemy[] = [];

/** What a step shows of the other side: its own marks, and the dead of earlier steps as ghosts. */
export interface EnemyMarks {
  readonly live: readonly TacticEnemy[];
  readonly ghosts: readonly TacticEnemy[];
}

export interface EnemySummaryEntry {
  readonly id: string;
  readonly note: string;
  readonly role: TacticEnemyRole | null;
  readonly takenBy: number | null;
  readonly isDead: boolean;
}

export interface StepEnemiesSummary {
  readonly count: number;
  readonly deadCount: number;
  readonly entries: readonly EnemySummaryEntry[];
}

export function oppositeSide(side: TacticSide): TacticSide {
  return side === 'CT' ? 'T' : 'CT';
}

export function enemiesOf(step: TacticStep | undefined): readonly TacticEnemy[] {
  return step?.enemies ?? NO_ENEMIES;
}

/** The enemies marked dead in steps before `stepIndex` of the steps a plan plays. */
export function enemyGhostsAt(
  steps: readonly TacticStep[],
  stepIndex: number,
): readonly TacticEnemy[] {
  return steps.slice(0, stepIndex).flatMap((step) => enemiesOf(step).filter((e) => e.isDead));
}

/** One entry per step, so playback can read the marks of whichever step it is in. */
export function enemyMarksByStep(steps: readonly TacticStep[]): readonly EnemyMarks[] {
  return steps.map((step, index) => ({
    live: enemiesOf(step),
    ghosts: enemyGhostsAt(steps, index),
  }));
}

/** The step's expected enemies as plain facts, for a panel that lists them. */
export function stepEnemiesSummary(step: TacticStep | undefined): StepEnemiesSummary {
  const entries = enemiesOf(step).map(
    (enemy): EnemySummaryEntry => ({
      id: enemy.id,
      note: enemy.note?.trim() ?? '',
      role: enemy.role ?? null,
      takenBy: enemy.killedBy ?? null,
      isDead: enemy.isDead === true,
    }),
  );
  return {
    count: entries.length,
    deadCount: entries.filter((entry) => entry.isDead).length,
    entries,
  };
}
