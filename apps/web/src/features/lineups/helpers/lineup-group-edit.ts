import type { Lineup, LineupGroupTarget } from '@disa/demo-core';

/**
 * The lineups merged into one group: they share the first one's landing or its throw spot. Only
 * the group of that kind is set, so a lineup keeps whichever group of the other kind it was in.
 * Every one of them is the user's own afterwards, which is what saving a built-in's edit means.
 */
export function mergeLineups(
  lineups: readonly Lineup[],
  groupTarget: LineupGroupTarget,
  groupId: string,
): readonly Lineup[] {
  const [first] = lineups;
  if (first === undefined || lineups.length < 2) return [];

  if (groupTarget === 'landing') {
    return lineups.map((lineup) => ({
      ...lineup,
      groupId,
      landing: first.landing,
      isBuiltIn: false,
    }));
  }

  return lineups.map((lineup) => ({
    ...lineup,
    originGroupId: groupId,
    origin: first.origin,
    isBuiltIn: false,
  }));
}

/**
 * Every lineup of the groups of one kind the ids belong to, taken out of them. The other kind of
 * group is left as it is.
 */
export function ungroupLineups(
  lineups: readonly Lineup[],
  ids: ReadonlySet<string>,
  groupTarget: LineupGroupTarget,
): readonly Lineup[] {
  const groupOf = (lineup: Lineup): string | undefined =>
    groupTarget === 'landing' ? lineup.groupId : lineup.originGroupId;

  const groupIds = new Set(
    lineups.flatMap((lineup) => {
      const group = groupOf(lineup);
      return ids.has(lineup.id) && group !== undefined ? [group] : [];
    }),
  );

  return lineups
    .filter((lineup) => {
      const group = groupOf(lineup);
      return group !== undefined && groupIds.has(group);
    })
    .map((lineup) => {
      const { groupId: _groupId, groupTarget: _legacy, ...landingKept } = lineup;
      const { originGroupId: _originGroupId, groupTarget: _legacyToo, ...originKept } = lineup;
      return { ...(groupTarget === 'landing' ? landingKept : originKept), isBuiltIn: false };
    });
}

/** A bounce added halfway between the last point of the throw and the landing, to be dragged into place. */
export function withBounce(lineup: Lineup): Lineup {
  const waypoints = lineup.waypoints ?? [];
  const previous = waypoints.at(-1) ?? lineup.origin;

  return {
    ...lineup,
    waypoints: [
      ...waypoints,
      {
        x: (previous.x + lineup.landing.x) / 2,
        y: (previous.y + lineup.landing.y) / 2,
        z: (previous.z + lineup.landing.z) / 2,
      },
    ],
    isBuiltIn: false,
  };
}

export function withoutBounce(lineup: Lineup, index: number): Lineup {
  return {
    ...lineup,
    waypoints: (lineup.waypoints ?? []).filter((_, position) => position !== index),
    isBuiltIn: false,
  };
}
