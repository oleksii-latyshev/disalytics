import type { Lineup, LineupGroupTarget } from '@disa/demo-core';
import { useCallback } from 'react';
import {
  mergeLineups,
  ungroupLineups,
  withBounce,
  withoutBounce,
} from '../helpers/lineup-group-edit';
import { newGroupId } from '../helpers/lineup-ids';
import { movedLineups, type PointMove } from '../helpers/lineup-move';
import { persistLineups, removeLineups } from '../helpers/persist-lineup';

interface Options {
  map: string;
  lineups: readonly Lineup[];
  reload: () => Promise<void>;
}

/**
 * Every change to lineups that are already saved: a point moved, a bounce added or taken away,
 * lineups grouped, separated or deleted. Each writes once and reads the map's lineups again, so
 * what is on screen is what was stored.
 */
export function useLineupEdits({ map, lineups, reload }: Options) {
  const write = useCallback(
    async (store: () => Promise<boolean>): Promise<boolean> => {
      const isStored = await store();
      if (isStored) await reload();
      return isStored;
    },
    [reload],
  );

  const commitMove = (move: PointMove) =>
    write(() => persistLineups(movedLineups(lineups, move, map)));

  const addBounce = (lineup: Lineup) => write(() => persistLineups([withBounce(lineup)]));

  const removeBounce = (lineup: Lineup, index: number) =>
    write(() => persistLineups([withoutBounce(lineup, index)]));

  const ungroup = (ids: ReadonlySet<string>, groupTarget: LineupGroupTarget) =>
    write(() => persistLineups(ungroupLineups(lineups, ids, groupTarget)));

  const merge = (selected: readonly Lineup[], groupTarget: LineupGroupTarget) =>
    write(() => persistLineups(mergeLineups(selected, groupTarget, newGroupId())));

  const remove = (ids: readonly string[]) => write(() => removeLineups(ids));

  return { commitMove, addBounce, removeBounce, ungroup, merge, remove };
}
