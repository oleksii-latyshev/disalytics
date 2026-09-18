import type { Team } from '../schema';

// Source: Counter-Strike 2 Release (Sept 27, 2023) & MR12 update (Sept 1, 2023).
export const STARTING_MONEY_REGULATION = 800;
export const STARTING_MONEY_OVERTIME = 10_000;
export const MAX_MONEY = 16_000;

export const REGULATION_ROUNDS_PER_HALF = 12;
export const REGULATION_TOTAL_ROUNDS = 24;
export const OVERTIME_ROUNDS_PER_HALF = 3;

// Round win rewards — Source: CS2 Release (Sept 2023).
export const WIN_REWARD_ELIMINATION = 3_250;
export const WIN_REWARD_BOMB_DEFUSED = 3_500;
export const WIN_REWARD_BOMB_EXPLODED = 3_500;
export const WIN_REWARD_TIME_EXPIRED = 3_250;

// Loss bonus ladder — Source: CS:GO Update March 13, 2019, retained in CS2.
export const LOSS_BONUS_LADDER = [1_400, 1_900, 2_400, 2_900, 3_400] as const;
export const MAX_LOSS_STREAK = 4;
export const LOSS_BONUS_STEP = 500;

// Terrorist bonus when bomb is planted but round is lost — Source: CS2 Release (Sept 2023).
export const BOMB_PLANTED_LOSS_BONUS = 800;

// Kill rewards by weapon category — Source: CS2 Release (Sept 2023) & Feb 6, 2024 update (Zeus).
export const KILL_REWARD_DEFAULT = 300;
export const KILL_REWARD_SMG = 600;
export const KILL_REWARD_P90 = 300;
export const KILL_REWARD_SHOTGUN = 900;
export const KILL_REWARD_AWP = 100;
export const KILL_REWARD_CZ75 = 100;
export const KILL_REWARD_KNIFE = 1_500;
export const KILL_REWARD_ZEUS = 100;

// Equipment buy thresholds — Source: CS2 competitive economy norms.
export const BUY_THRESHOLD_FULL_CT = 4_500;
export const BUY_THRESHOLD_FULL_T = 4_000;
export const BUY_THRESHOLD_FORCE = 2_000;

export type RoundEndReason = 'elimination' | 'bomb-defused' | 'bomb-exploded' | 'time-expired';

export type PreviousBuyType = 'full' | 'force' | 'eco';

export type BuyCall = 'eco' | 'force' | 'full';

export interface WeaponKillCounts {
  readonly rifles?: number;
  readonly smgs?: number;
  readonly shotguns?: number;
  readonly snipers?: number;
  readonly knife?: number;
}

export interface EconomyCalculatorInputs {
  readonly team: Team;
  readonly result: 'won' | 'lost';
  readonly reason: RoundEndReason;
  readonly lossStreak: number;
  readonly bombPlantedOnLoss?: boolean;
  readonly survivedTWithoutPlant?: boolean;
  readonly previousBuy: PreviousBuyType;
  readonly customRemainingCash?: number;
  readonly kills?: WeaponKillCounts;
}

export interface EconomyEstimate {
  readonly roundRewardPerPlayer: number;
  readonly estimatedRemainingBank: number;
  readonly killRewardsTotal: number;
  readonly killRewardsPerPlayer: number;
  readonly estimatedNextRoundPerPlayer: number;
  readonly estimatedNextRoundTeamTotal: number;
  readonly buyCall: BuyCall;
  readonly nextLossStreak: number;
}

export function calculateRoundReward(
  inputs: Pick<
    EconomyCalculatorInputs,
    'team' | 'result' | 'reason' | 'lossStreak' | 'bombPlantedOnLoss' | 'survivedTWithoutPlant'
  >,
): number {
  if (inputs.result === 'won') {
    switch (inputs.reason) {
      case 'bomb-defused':
        return WIN_REWARD_BOMB_DEFUSED;
      case 'bomb-exploded':
        return WIN_REWARD_BOMB_EXPLODED;
      case 'elimination':
        return WIN_REWARD_ELIMINATION;
      case 'time-expired':
        return WIN_REWARD_TIME_EXPIRED;
    }
  }

  if (inputs.team === 'T' && inputs.survivedTWithoutPlant) {
    return 0;
  }

  const streakIndex = Math.min(Math.max(inputs.lossStreak, 0), MAX_LOSS_STREAK);
  const baseLoss = LOSS_BONUS_LADDER[streakIndex] ?? LOSS_BONUS_LADDER[0];
  const plantBonus = inputs.team === 'T' && inputs.bombPlantedOnLoss ? BOMB_PLANTED_LOSS_BONUS : 0;

  return baseLoss + plantBonus;
}

export function calculateKillRewards(kills?: WeaponKillCounts): number {
  if (kills === undefined) return 0;

  const rifles = (kills.rifles ?? 0) * KILL_REWARD_DEFAULT;
  const smgs = (kills.smgs ?? 0) * KILL_REWARD_SMG;
  const shotguns = (kills.shotguns ?? 0) * KILL_REWARD_SHOTGUN;
  const snipers = (kills.snipers ?? 0) * KILL_REWARD_AWP;
  const knife = (kills.knife ?? 0) * KILL_REWARD_KNIFE;

  return rifles + smgs + shotguns + snipers + knife;
}

export function estimateRemainingBank(
  previousBuy: PreviousBuyType,
  customRemainingCash?: number,
): number {
  if (customRemainingCash !== undefined) {
    return Math.max(0, customRemainingCash);
  }

  switch (previousBuy) {
    case 'full':
      return 300;
    case 'force':
      return 700;
    case 'eco':
      return 2_200;
  }
}

export function estimateBuyCall(moneyPerPlayer: number, team: Team): BuyCall {
  const fullThreshold = team === 'CT' ? BUY_THRESHOLD_FULL_CT : BUY_THRESHOLD_FULL_T;

  if (moneyPerPlayer >= fullThreshold) return 'full';
  if (moneyPerPlayer >= BUY_THRESHOLD_FORCE) return 'force';
  return 'eco';
}

export function calculateNextRoundEconomy(inputs: EconomyCalculatorInputs): EconomyEstimate {
  const roundRewardPerPlayer = calculateRoundReward(inputs);
  const estimatedRemainingBank = estimateRemainingBank(
    inputs.previousBuy,
    inputs.customRemainingCash,
  );
  const killRewardsTotal = calculateKillRewards(inputs.kills);
  const killRewardsPerPlayer = Math.round(killRewardsTotal / 5);

  const estimatedNextRoundPerPlayer = Math.min(
    MAX_MONEY,
    roundRewardPerPlayer + estimatedRemainingBank + killRewardsPerPlayer,
  );
  const estimatedNextRoundTeamTotal = estimatedNextRoundPerPlayer * 5;
  const buyCall = estimateBuyCall(estimatedNextRoundPerPlayer, inputs.team);

  const nextLossStreak =
    inputs.result === 'won'
      ? Math.max(0, inputs.lossStreak - 1)
      : Math.min(MAX_LOSS_STREAK, inputs.lossStreak + 1);

  return {
    roundRewardPerPlayer,
    estimatedRemainingBank,
    killRewardsTotal,
    killRewardsPerPlayer,
    estimatedNextRoundPerPlayer,
    estimatedNextRoundTeamTotal,
    buyCall,
    nextLossStreak,
  };
}
