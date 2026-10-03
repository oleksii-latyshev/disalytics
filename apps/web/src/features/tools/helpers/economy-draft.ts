import {
  type EnemyRoundObservation,
  emptyWeaponObservations,
  type RoundEndReason,
  type Team,
} from '@disa/demo-core';

export function newObservation(ourSide: Team): EnemyRoundObservation {
  return {
    ourSide,
    weWon: true,
    reason: 'elimination',
    enemySurvivors: 0,
    bombPlanted: null,
    enemyKills: null,
    weapons: emptyWeaponObservations(),
  };
}

export function reasonsForWinner(winner: Team): readonly RoundEndReason[] {
  return winner === 'T'
    ? ['elimination', 'bomb-exploded']
    : ['elimination', 'bomb-defused', 'time-expired'];
}

export function choiceClass(selected: boolean): string {
  return (
    'min-h-11 rounded-chip border px-3 py-2 text-12 transition-colors ' +
    (selected
      ? 'border-ink bg-ink text-surface-0'
      : 'border-line bg-surface-2 text-ink-dim hover:border-line-strong hover:text-ink')
  );
}

export function formatMoneyRange(money: Intl.NumberFormat, floor: number, ceiling: number): string {
  return floor === ceiling
    ? money.format(ceiling)
    : `${money.format(floor)}–${money.format(Math.round(ceiling / 100) * 100)}`;
}
