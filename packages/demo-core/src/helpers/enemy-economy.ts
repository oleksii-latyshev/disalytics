import type { Team } from '../schema';
import {
  calculateRoundReward,
  MAX_LOSS_STREAK,
  MAX_MONEY,
  REGULATION_ROUNDS_PER_HALF,
  REGULATION_TOTAL_ROUNDS,
  type RoundEndReason,
  STARTING_MONEY_OVERTIME,
  STARTING_MONEY_REGULATION,
} from './economy-rules';
import { WEAPON_REFERENCES } from './reference-data';

export const OBSERVED_WEAPONS = ['ak47', 'm4', 'smg', 'awp', 'shotgun', 'pistol', 'other'] as const;

export type ObservedWeapon = (typeof OBSERVED_WEAPONS)[number];
export type WeaponObservations = Readonly<Record<ObservedWeapon, number>>;

export interface EnemyRoundObservation {
  readonly ourSide: Team;
  readonly weWon: boolean;
  readonly reason: RoundEndReason;
  readonly enemySurvivors: number | null;
  readonly bombPlanted: boolean | null;
  readonly enemyKills: number | null;
  readonly weapons: WeaponObservations;
}

export interface EnemyRoundEstimate {
  readonly round: number;
  readonly enemySide: Team;
  readonly lossStreak: number;
  readonly startingCashPerPlayer: number;
  readonly observedWeaponSpend: number;
  readonly estimatedNewWeaponSpend: number;
  readonly roundRewardPerPlayer: number;
  readonly estimatedNextCashFloorPerPlayer: number;
  readonly estimatedNextCashPerPlayer: number;
  readonly knownWeapons: number;
  readonly assumptions: readonly (
    | 'unknownWeapons'
    | 'survivorCarry'
    | 'unpricedEquipment'
    | 'unknownKills'
    | 'genericKillReward'
    | 'unknownPlant'
    | 'otherUnpriced'
    | 'unknownSurvivors'
  )[];
}

const priceOf = (name: string): number =>
  WEAPON_REFERENCES.find((weapon) => weapon.name === name)?.price ?? 0;

const WEAPON_PRICE: Readonly<Record<ObservedWeapon, number>> = {
  ak47: priceOf('AK-47'),
  m4: Math.round((priceOf('M4A4') + priceOf('M4A1-S')) / 2),
  smg: Math.round((priceOf('MAC-10') + priceOf('MP9') + priceOf('UMP-45')) / 3),
  awp: priceOf('AWP'),
  shotgun: Math.round((priceOf('Nova') + priceOf('MAG-7')) / 2),
  pistol: priceOf('Desert Eagle'),
  other: 0,
};

export function emptyWeaponObservations(): WeaponObservations {
  return { ak47: 0, m4: 0, smg: 0, awp: 0, shotgun: 0, pistol: 0, other: 0 };
}

export function countObservedWeapons(weapons: WeaponObservations): number {
  return OBSERVED_WEAPONS.reduce((count, weapon) => count + weapons[weapon], 0);
}

export function changeObservedWeaponCount(
  weapons: WeaponObservations,
  weapon: ObservedWeapon,
  change: -1 | 1,
): WeaponObservations {
  const next = weapons[weapon] + change;
  if (next < 0 || (change > 0 && countObservedWeapons(weapons) >= 5)) return weapons;
  return { ...weapons, [weapon]: next };
}

export function observedWeaponSpend(weapons: WeaponObservations): number {
  return OBSERVED_WEAPONS.reduce(
    (spend, weapon) => spend + weapons[weapon] * WEAPON_PRICE[weapon],
    0,
  );
}

function isHalfStart(round: number): boolean {
  return (
    round === 1 ||
    round === REGULATION_ROUNDS_PER_HALF + 1 ||
    (round > REGULATION_TOTAL_ROUNDS && (round - REGULATION_TOTAL_ROUNDS - 1) % 3 === 0)
  );
}

function startingCash(round: number, previous?: EnemyRoundEstimate): number {
  if (!isHalfStart(round)) {
    return previous?.estimatedNextCashPerPlayer ?? STARTING_MONEY_REGULATION;
  }
  return round > REGULATION_TOTAL_ROUNDS ? STARTING_MONEY_OVERTIME : STARTING_MONEY_REGULATION;
}

function roundIncome(
  observation: EnemyRoundObservation,
  enemySide: Team,
  lossStreak: number,
): number {
  const base = calculateRoundReward({
    team: enemySide,
    result: observation.weWon ? 'lost' : 'won',
    reason: observation.reason,
    lossStreak,
    bombPlantedOnLoss: observation.bombPlanted === true,
  });
  const timeSave =
    enemySide === 'T' &&
    observation.weWon &&
    observation.reason === 'time-expired' &&
    observation.bombPlanted === false;
  return timeSave
    ? Math.round((base * (5 - Math.min(observation.enemySurvivors ?? 0, 5))) / 5)
    : base;
}

function estimateAssumptions(
  observation: EnemyRoundObservation,
  enemySide: Team,
  knownWeapons: number,
  previousSurvivors: number,
  previousSurvivorsUnknown: boolean,
): EnemyRoundEstimate['assumptions'] {
  const assumptions: EnemyRoundEstimate['assumptions'][number][] = ['unpricedEquipment'];
  if (knownWeapons < 5) assumptions.push('unknownWeapons');
  if (previousSurvivors > 0 && knownWeapons > 0) assumptions.push('survivorCarry');
  if (observation.enemyKills === null) assumptions.push('unknownKills');
  if (observation.enemyKills !== null && observation.enemyKills > 0) {
    assumptions.push('genericKillReward');
  }
  if (observation.weapons.other > 0) assumptions.push('otherUnpriced');
  if (observation.enemySurvivors === null || previousSurvivorsUnknown) {
    assumptions.push('unknownSurvivors');
  }
  if (enemySide === 'T' && observation.weWon && observation.bombPlanted === null) {
    assumptions.push('unknownPlant');
  }
  return assumptions;
}

function estimateOneRound(
  observation: EnemyRoundObservation,
  round: number,
  previous?: EnemyRoundEstimate,
  previousObservation?: EnemyRoundObservation,
): EnemyRoundEstimate {
  const enemySide: Team = observation.ourSide === 'CT' ? 'T' : 'CT';
  const halfStart = isHalfStart(round);
  const lossStreak = halfStart ? 1 : (previous?.lossStreak ?? 1);
  const startingCashPerPlayer = startingCash(round, previous);
  const knownWeapons = countObservedWeapons(observation.weapons);
  const weaponSpend = observedWeaponSpend(observation.weapons);
  const previousSurvivors = halfStart ? 0 : (previousObservation?.enemySurvivors ?? 0);
  const previousSurvivorsUnknown = !halfStart && previousObservation?.enemySurvivors === null;
  const estimatedNewWeaponSpend = Math.round(
    weaponSpend * (1 - Math.min(previousSurvivors, 5) / 5),
  );
  const roundRewardPerPlayer = roundIncome(observation, enemySide, lossStreak);
  const killIncomePerPlayer =
    observation.enemyKills === null ? 0 : Math.round((observation.enemyKills * 300) / 5);
  const estimatedNextCashFloorPerPlayer = Math.min(
    MAX_MONEY,
    roundRewardPerPlayer + killIncomePerPlayer,
  );
  const estimatedNextCashPerPlayer = Math.min(
    MAX_MONEY,
    Math.max(0, startingCashPerPlayer - estimatedNewWeaponSpend / 5) +
      roundRewardPerPlayer +
      killIncomePerPlayer,
  );

  return {
    round,
    enemySide,
    lossStreak: observation.weWon
      ? Math.min(MAX_LOSS_STREAK, lossStreak + 1)
      : Math.max(0, lossStreak - 1),
    startingCashPerPlayer,
    observedWeaponSpend: weaponSpend,
    estimatedNewWeaponSpend,
    roundRewardPerPlayer,
    estimatedNextCashFloorPerPlayer,
    estimatedNextCashPerPlayer: Math.round(estimatedNextCashPerPlayer),
    knownWeapons,
    assumptions: estimateAssumptions(
      observation,
      enemySide,
      knownWeapons,
      previousSurvivors,
      previousSurvivorsUnknown,
    ),
  };
}

export function estimateEnemyRounds(
  observations: readonly EnemyRoundObservation[],
): readonly EnemyRoundEstimate[] {
  const estimates: EnemyRoundEstimate[] = [];
  for (const observation of observations) {
    const round = estimates.length + 1;
    estimates.push(estimateOneRound(observation, round, estimates.at(-1), observations[round - 2]));
  }
  return estimates;
}
