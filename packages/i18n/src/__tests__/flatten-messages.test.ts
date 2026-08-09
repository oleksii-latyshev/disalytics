import { describe, expect, it } from 'vitest';
import type { LocaleResources } from '../config';
import { flattenResources } from '../helpers/flatten-messages';

const resources = {
  common: { tagline: 'Tagline' },
  library: {},
  review: {},
  controls: {},
  timeline: { roundsRemaining: '{count} left' },
  inspector: {},
  filters: { blindDuration: { label: 'Blind duration', hint: 'Seconds' } },
  radar: {},
  settings: {},
  errors: {},
} satisfies LocaleResources;

describe('flattenResources', () => {
  it('prefixes every key with its namespace', () => {
    expect(flattenResources(resources)).toEqual({
      'common.tagline': 'Tagline',
      'timeline.roundsRemaining': '{count} left',
      'filters.blindDuration.label': 'Blind duration',
      'filters.blindDuration.hint': 'Seconds',
    });
  });

  it('yields nothing for a namespace with no messages', () => {
    expect(flattenResources({ ...resources, common: {} })).not.toHaveProperty('common.tagline');
  });
});
