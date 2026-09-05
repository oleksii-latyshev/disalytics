import type { PlayerSlot } from '@disa/demo-core';
import { useMemo } from 'react';
import { useSetting } from '@/core/settings';
import type { AxisFacet, AxisFilter } from '../helpers/axis-filter';

/**
 * The filter the axis is currently under, assembled from the four preferences that hold it.
 *
 * Both this and `AxisFilters` read those keys straight out of the settings store rather than being
 * handed the values by the stage — a setting is read where it is obeyed (#202), and here that means
 * twice: once by the control that writes it and once by the axis that draws under it.
 *
 * The facets are memoised on the three flags rather than rebuilt per render, because an array with a
 * new identity every render is a filter with a new identity every render, and the axis above this
 * one re-renders at the 10 Hz readout.
 */
export function useAxisFilter(selectedSlot: PlayerSlot | null): AxisFilter {
  const [areKillsShown] = useSetting('areAxisKillsShown');
  const [isUtilityShown] = useSetting('isAxisUtilityShown');
  const [areObjectivesShown] = useSetting('areAxisObjectivesShown');
  const [isSelectedOnly] = useSetting('isAxisSelectedOnly');

  const facets = useMemo(() => {
    const chosen: AxisFacet[] = [];

    if (areKillsShown) chosen.push('kills');
    if (isUtilityShown) chosen.push('utility');
    if (areObjectivesShown) chosen.push('objectives');

    return chosen;
  }, [areKillsShown, isUtilityShown, areObjectivesShown]);

  // Narrowing to a player nobody has selected would empty the axis rather than narrow it, so the
  // preference is remembered and simply does not apply until there is someone to apply it to.
  const subject = isSelectedOnly ? selectedSlot : null;

  return useMemo(() => ({ facets, subject }), [facets, subject]);
}
