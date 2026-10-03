import { describe, expect, it } from 'vitest';
import { focusedLineupIndex, mergeAvailability } from '../helpers/lineup-view-rules';

describe('focusedLineupIndex', () => {
  it('prefers the selection over the hover and answers null for neither', () => {
    expect(focusedLineupIndex(2, 5)).toBe(2);
    expect(focusedLineupIndex(-1, 5)).toBe(5);
    expect(focusedLineupIndex(-1, -1)).toBeNull();
  });
});

describe('mergeAvailability', () => {
  it('offers nothing on the plate in view mode', () => {
    expect(mergeAvailability('view', 0, undefined)).toEqual({
      selected: false,
      landings: false,
      origins: false,
      list: true,
    });
  });

  it('offers every merge while no node is selected', () => {
    expect(mergeAvailability('edit', 0, undefined)).toEqual({
      selected: true,
      landings: true,
      origins: true,
      list: true,
    });
  });

  it('offers only the merge a node selection resolves to', () => {
    expect(mergeAvailability('edit', 2, 'landing')).toEqual({
      selected: false,
      landings: true,
      origins: false,
      list: true,
    });
    expect(mergeAvailability('edit', 2, undefined).list).toBe(false);
  });
});
