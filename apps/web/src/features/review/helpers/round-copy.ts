import type { RoundWinReason, TeamBuyClass } from '@disa/demo-core';
import type { TranslationKey } from '@disa/i18n';

export const REASON_KEYS: Readonly<Record<RoundWinReason, TranslationKey>> = {
  'bomb-exploded': 'review.stats.reason.bombExploded',
  'bomb-defused': 'review.stats.reason.bombDefused',
  'all-ct-eliminated': 'review.stats.reason.allCtEliminated',
  'all-t-eliminated': 'review.stats.reason.allTEliminated',
  'time-expired': 'review.stats.reason.timeExpired',
  draw: 'review.stats.reason.draw',
};

export const BUY_SHORT_KEYS: Readonly<Record<TeamBuyClass, TranslationKey>> = {
  pistol: 'review.stats.buy.short.pistol',
  full: 'review.stats.buy.short.full',
  force: 'review.stats.buy.short.force',
  eco: 'review.stats.buy.short.eco',
  mixed: 'review.stats.buy.short.mixed',
};

export const BUY_NAME_KEYS: Readonly<Record<TeamBuyClass, TranslationKey>> = {
  pistol: 'review.stats.buy.name.pistol',
  full: 'review.stats.buy.name.full',
  force: 'review.stats.buy.name.force',
  eco: 'review.stats.buy.name.eco',
  mixed: 'review.stats.buy.name.mixed',
};

/** The buys the legend explains, in the order a reader meets them. */
export const BUY_LEGEND: readonly TeamBuyClass[] = ['pistol', 'full', 'force', 'eco', 'mixed'];
