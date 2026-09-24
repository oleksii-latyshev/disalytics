import { describe, expect, it } from 'vitest';
import {
  changeObservedWeaponCount,
  countObservedWeapons,
  type EnemyRoundObservation,
  emptyWeaponObservations,
  estimateEnemyRounds,
  observedWeaponSpend,
} from '../helpers/enemy-economy';

function round(overrides: Partial<EnemyRoundObservation> = {}): EnemyRoundObservation {
  return {
    ourSide: 'CT',
    weWon: true,
    reason: 'elimination',
    enemySurvivors: 0,
    bombPlanted: false,
    enemyKills: 0,
    weapons: emptyWeaponObservations(),
    ...overrides,
  };
}

describe('enemy economy history', () => {
  it('counts a five-player weapon mix and refuses a sixth observation', () => {
    let weapons = emptyWeaponObservations();
    weapons = changeObservedWeaponCount(weapons, 'ak47', 1);
    weapons = changeObservedWeaponCount(weapons, 'ak47', 1);
    weapons = changeObservedWeaponCount(weapons, 'smg', 1);
    weapons = changeObservedWeaponCount(weapons, 'smg', 1);
    weapons = changeObservedWeaponCount(weapons, 'smg', 1);
    expect(countObservedWeapons(weapons)).toBe(5);
    expect(observedWeaponSpend(weapons)).toBeGreaterThan(5_400);
    expect(changeObservedWeaponCount(weapons, 'awp', 1)).toBe(weapons);
    expect(changeObservedWeaponCount(emptyWeaponObservations(), 'awp', -1)).toEqual(
      emptyWeaponObservations(),
    );
  });

  it('carries the estimate and loss bonus through consecutive rounds', () => {
    const rounds = [round(), round(), round()];
    const estimates = estimateEnemyRounds(rounds);
    expect(estimates[0]?.estimatedNextCashFloorPerPlayer).toBe(1_900);
    expect(estimates[0]?.estimatedNextCashPerPlayer).toBe(2_700);
    expect(estimates.map((estimate) => estimate.roundRewardPerPlayer)).toEqual([
      1_900, 2_400, 2_900,
    ]);
    expect(estimates[1]?.startingCashPerPlayer).toBe(estimates[0]?.estimatedNextCashPerPlayer);
    expect(estimates[2]?.estimatedNextCashPerPlayer).toBeGreaterThan(
      estimates[1]?.estimatedNextCashPerPlayer ?? 0,
    );
  });

  it('recomputes later rounds from an edited earlier observation', () => {
    const before = estimateEnemyRounds([round(), round(), round()]);
    const after = estimateEnemyRounds([round({ weWon: false }), round(), round()]);
    expect(after[1]?.startingCashPerPlayer).not.toBe(before[1]?.startingCashPerPlayer);
    expect(after[2]?.estimatedNextCashPerPlayer).not.toBe(before[2]?.estimatedNextCashPerPlayer);
  });

  it('reduces modeled spend when weapons may have been carried by survivors', () => {
    const weapons = { ...emptyWeaponObservations(), ak47: 2, smg: 3 };
    const noCarry = estimateEnemyRounds([round({ enemySurvivors: 0 }), round({ weapons })]);
    const carry = estimateEnemyRounds([round({ enemySurvivors: 2 }), round({ weapons })]);
    expect(carry[1]?.estimatedNewWeaponSpend).toBeLessThan(
      noCarry[1]?.estimatedNewWeaponSpend ?? 0,
    );
    expect(carry[1]?.assumptions).toContain('survivorCarry');
  });

  it('resets starting cash and loss bonus at the second half', () => {
    const rounds = Array.from({ length: 13 }, () => round());
    const estimates = estimateEnemyRounds(rounds);
    expect(estimates[12]?.startingCashPerPlayer).toBe(800);
    expect(estimates[12]?.roundRewardPerPlayer).toBe(1_900);
  });

  it('marks unknown rewards and equipment instead of treating them as known', () => {
    const estimate = estimateEnemyRounds([round({ bombPlanted: null, enemyKills: null })])[0];
    expect(estimate?.assumptions).toEqual([
      'unpricedEquipment',
      'unknownWeapons',
      'unknownKills',
      'unknownPlant',
    ]);
  });

  it('keeps unknown survivors visible in the following round', () => {
    const weapons = { ...emptyWeaponObservations(), smg: 3 };
    const estimates = estimateEnemyRounds([
      round({ weWon: false, enemySurvivors: null }),
      round({ weapons }),
    ]);
    expect(estimates[0]?.assumptions).toContain('unknownSurvivors');
    expect(estimates[1]?.assumptions).toContain('unknownSurvivors');
  });
});
