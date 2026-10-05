import { HEAT_BIN_SECONDS, HEAT_BINS, type HeatBuy } from '@disa/demo-core';
import type { Translate } from '@disa/i18n';
import type { HeatLegendKind } from '../components/HeatLegend';
import { clockOf, isWholeRange, type RoundRange } from './heat-range';
import type { HeatCompareView, HeatReading } from './heat-view';
import type { SideScope } from './map-scope';

/** The part of the round a range stands for, as the clock reads it. */
export function rangeLabel(t: Translate, range: RoundRange): string {
  if (isWholeRange(range)) return t('review.heat.when.wholeRange');

  const from = clockOf(range.first * HEAT_BIN_SECONDS);

  return range.last >= HEAT_BINS - 1
    ? t('review.heat.when.rangeToEnd', { from })
    : t('review.heat.when.range', { from, to: clockOf((range.last + 1) * HEAT_BIN_SECONDS) });
}

/** What the match is narrowed to, in a line — or that it is not. */
export function filterSummary(
  t: Translate,
  filters: { side: SideScope; buy: HeatBuy | null; range: RoundRange },
): string {
  const { side, buy, range } = filters;
  const parts = [
    side === 'all' ? null : t('review.heat.filters.side', { side }),
    buy === null ? null : t('review.heat.filters.buy', { buy: t(`review.heat.buy.${buy}`) }),
    isWholeRange(range) ? null : t('review.heat.filters.time', { range: rangeLabel(t, range) }),
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? t('review.heat.filters.whole') : parts.join(' · ');
}

/** The heading over the plates: one player's reading, a pair, or the difference between two. */
export function heatTitleKey(
  reading: HeatReading,
  compare: HeatCompareView | null,
):
  | 'review.heat.title.stood'
  | 'review.heat.title.died'
  | 'review.heat.title.pair'
  | 'review.heat.title.difference' {
  if (compare === 'difference') return 'review.heat.title.difference';
  if (compare === 'side') return 'review.heat.title.pair';

  return reading === 'stood' ? 'review.heat.title.stood' : 'review.heat.title.died';
}

/** What the corner of the plate explains: a ramp, rings, two colours or their difference. */
export function heatLegendKind(
  reading: HeatReading,
  compare: HeatCompareView | null,
): HeatLegendKind {
  if (compare === 'difference') return 'difference';
  if (reading === 'died') return 'rings';

  return compare === 'side' ? 'pair' : 'field';
}
