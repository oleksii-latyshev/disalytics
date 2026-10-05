import type { Translate } from '@disa/i18n';
import { describe, expect, it } from 'vitest';
import { filterSummary, rangeLabel } from '../helpers/heat-copy';
import { rangeOfPhase, WHOLE_RANGE } from '../helpers/heat-range';

/** The key and its values, which is all a test of what gets asked for needs to read. */
const t: Translate = (path, values) =>
  values === undefined ? path : `${path}(${Object.values(values).join(',')})`;

describe('rangeLabel', () => {
  it('names the whole round, a closed range and a range that runs to the end', () => {
    expect(rangeLabel(t, WHOLE_RANGE)).toBe('review.heat.when.wholeRange');
    expect(rangeLabel(t, rangeOfPhase('start'))).toBe('review.heat.when.range(0:00,0:20)');
    expect(rangeLabel(t, rangeOfPhase('end'))).toBe('review.heat.when.rangeToEnd(1:00)');
  });
});

describe('filterSummary', () => {
  it('says the whole match when nothing narrows it', () => {
    expect(filterSummary(t, { side: 'all', buy: null, range: WHOLE_RANGE })).toBe(
      'review.heat.filters.whole',
    );
  });

  it('lists only what is narrowed, side first', () => {
    expect(
      filterSummary(t, { side: 'T', buy: 'full', range: rangeOfPhase('start') }).split(' · '),
    ).toHaveLength(3);
    expect(filterSummary(t, { side: 'CT', buy: null, range: WHOLE_RANGE })).toBe(
      'review.heat.filters.side(CT)',
    );
  });
});
