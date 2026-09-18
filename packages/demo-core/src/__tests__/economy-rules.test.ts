import { describe, expect, it } from 'vitest';
import {
  BOMB_PLANTED_LOSS_BONUS,
  calculateKillRewards,
  calculateNextRoundEconomy,
  calculateRoundReward,
  estimateBuyCall,
  estimateRemainingBank,
  KILL_REWARD_AWP,
  KILL_REWARD_DEFAULT,
  KILL_REWARD_KNIFE,
  KILL_REWARD_SHOTGUN,
  KILL_REWARD_SMG,
  LOSS_BONUS_LADDER,
  MAX_MONEY,
  WIN_REWARD_BOMB_DEFUSED,
  WIN_REWARD_BOMB_EXPLODED,
  WIN_REWARD_ELIMINATION,
  WIN_REWARD_TIME_EXPIRED,
} from '../helpers/economy-rules';

describe('calculateRoundReward', () => {
  it('calculates round rewards for wins correctly', () => {
    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'won',
        reason: 'elimination',
        lossStreak: 0,
      }),
    ).toBe(WIN_REWARD_ELIMINATION);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'won',
        reason: 'bomb-defused',
        lossStreak: 0,
      }),
    ).toBe(WIN_REWARD_BOMB_DEFUSED);

    expect(
      calculateRoundReward({
        team: 'T',
        result: 'won',
        reason: 'bomb-exploded',
        lossStreak: 0,
      }),
    ).toBe(WIN_REWARD_BOMB_EXPLODED);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'won',
        reason: 'time-expired',
        lossStreak: 0,
      }),
    ).toBe(WIN_REWARD_TIME_EXPIRED);
  });

  it('calculates loss rewards across loss bonus ladder', () => {
    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'lost',
        reason: 'elimination',
        lossStreak: 0,
      }),
    ).toBe(LOSS_BONUS_LADDER[0]);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'lost',
        reason: 'elimination',
        lossStreak: 1,
      }),
    ).toBe(LOSS_BONUS_LADDER[1]);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'lost',
        reason: 'elimination',
        lossStreak: 2,
      }),
    ).toBe(LOSS_BONUS_LADDER[2]);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'lost',
        reason: 'elimination',
        lossStreak: 3,
      }),
    ).toBe(LOSS_BONUS_LADDER[3]);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'lost',
        reason: 'elimination',
        lossStreak: 4,
      }),
    ).toBe(LOSS_BONUS_LADDER[4]);

    expect(
      calculateRoundReward({
        team: 'CT',
        result: 'lost',
        reason: 'elimination',
        lossStreak: 10,
      }),
    ).toBe(LOSS_BONUS_LADDER[4]);
  });

  it('adds bomb plant bonus for Terrorists on lost round', () => {
    expect(
      calculateRoundReward({
        team: 'T',
        result: 'lost',
        reason: 'bomb-defused',
        lossStreak: 0,
        bombPlantedOnLoss: true,
      }),
    ).toBe(LOSS_BONUS_LADDER[0] + BOMB_PLANTED_LOSS_BONUS);
  });

  it('gives zero reward for surviving Terrorist on round loss without bomb plant', () => {
    expect(
      calculateRoundReward({
        team: 'T',
        result: 'lost',
        reason: 'time-expired',
        lossStreak: 2,
        survivedTWithoutPlant: true,
      }),
    ).toBe(0);
  });
});

describe('calculateKillRewards', () => {
  it('calculates kill rewards by weapon categories', () => {
    expect(calculateKillRewards()).toBe(0);
    expect(
      calculateKillRewards({
        rifles: 2,
        smgs: 1,
        shotguns: 1,
        snipers: 1,
        knife: 1,
      }),
    ).toBe(
      2 * KILL_REWARD_DEFAULT +
        KILL_REWARD_SMG +
        KILL_REWARD_SHOTGUN +
        KILL_REWARD_AWP +
        KILL_REWARD_KNIFE,
    );
  });
});

describe('estimateRemainingBank', () => {
  it('returns estimated remaining cash from buy type or custom cash', () => {
    expect(estimateRemainingBank('full')).toBe(300);
    expect(estimateRemainingBank('force')).toBe(700);
    expect(estimateRemainingBank('eco')).toBe(2_200);
    expect(estimateRemainingBank('full', 1_500)).toBe(1_500);
  });
});

describe('estimateBuyCall', () => {
  it('categorizes buy calls based on team equipment costs', () => {
    expect(estimateBuyCall(5_000, 'CT')).toBe('full');
    expect(estimateBuyCall(4_500, 'CT')).toBe('full');
    expect(estimateBuyCall(4_200, 'CT')).toBe('force');
    expect(estimateBuyCall(4_000, 'T')).toBe('full');
    expect(estimateBuyCall(2_500, 'T')).toBe('force');
    expect(estimateBuyCall(1_800, 'T')).toBe('eco');
  });
});

describe('calculateNextRoundEconomy', () => {
  it('combines round rewards, remaining bank and kill rewards', () => {
    const estimate = calculateNextRoundEconomy({
      team: 'T',
      result: 'won',
      reason: 'bomb-exploded',
      lossStreak: 1,
      previousBuy: 'full',
      kills: { rifles: 3 },
    });

    expect(estimate.roundRewardPerPlayer).toBe(WIN_REWARD_BOMB_EXPLODED);
    expect(estimate.estimatedRemainingBank).toBe(300);
    expect(estimate.killRewardsTotal).toBe(900);
    expect(estimate.killRewardsPerPlayer).toBe(180);
    expect(estimate.estimatedNextRoundPerPlayer).toBe(3_500 + 300 + 180);
    expect(estimate.buyCall).toBe('force');
    expect(estimate.nextLossStreak).toBe(0);
  });

  it('caps max money at $16,000', () => {
    const estimate = calculateNextRoundEconomy({
      team: 'CT',
      result: 'won',
      reason: 'bomb-defused',
      lossStreak: 0,
      previousBuy: 'full',
      customRemainingCash: 15_000,
    });

    expect(estimate.estimatedNextRoundPerPlayer).toBe(MAX_MONEY);
    expect(estimate.buyCall).toBe('full');
  });
});
