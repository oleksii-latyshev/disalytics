import type { Lineup, LineupGroupTarget, WorldPoint } from '@disa/demo-core';

/**
 * The lineups merged into one group: they share the first one's landing, or its throw spot. Every
 * one of them is the user's own afterwards, which is what saving a built-in's edit means.
 */
export function mergeLineups(
  lineups: readonly Lineup[],
  groupTarget: LineupGroupTarget,
  groupId: string,
): readonly Lineup[] {
  const [first] = lineups;
  if (first === undefined || lineups.length < 2) return [];

  const shared: WorldPoint = groupTarget === 'landing' ? first.landing : first.origin;

  return lineups.map((lineup) => ({
    ...lineup,
    groupId,
    groupTarget,
    landing: groupTarget === 'landing' ? shared : lineup.landing,
    origin: groupTarget === 'origin' ? shared : lineup.origin,
    isBuiltIn: false,
  }));
}

/** Every lineup of the groups the ids belong to, taken out of them. */
export function ungroupLineups(
  lineups: readonly Lineup[],
  ids: ReadonlySet<string>,
): readonly Lineup[] {
  const groupIds = new Set(
    lineups.flatMap((lineup) =>
      ids.has(lineup.id) && lineup.groupId !== undefined ? [lineup.groupId] : [],
    ),
  );

  return lineups
    .filter((lineup) => lineup.groupId !== undefined && groupIds.has(lineup.groupId))
    .map(({ groupId: _groupId, groupTarget: _groupTarget, ...rest }) => ({
      ...rest,
      isBuiltIn: false,
    }));
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
