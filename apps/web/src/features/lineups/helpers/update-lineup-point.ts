import type { Lineup } from '@disa/demo-core';

export interface LineupPointCoordinates {
  readonly x: number;
  readonly y: number;
}

export type LineupPointTarget = 'origin' | 'landing' | 'waypoint';

interface UpdateLineupsAtPointOptions {
  readonly lineups: readonly Lineup[];
  readonly lineupId: string;
  readonly target: LineupPointTarget;
  readonly point: LineupPointCoordinates;
  readonly waypointIndex?: number;
  readonly resolveCallout?: (point: LineupPointCoordinates) => string | null | undefined;
}

export function updateLineupsAtPoint({
  lineups,
  lineupId,
  target,
  point,
  waypointIndex,
  resolveCallout,
}: UpdateLineupsAtPointOptions): readonly Lineup[] | undefined {
  const lineup = lineups.find((item) => item.id === lineupId);
  if (lineup === undefined) return undefined;

  if (target === 'waypoint') {
    if (waypointIndex === undefined) return undefined;
    const waypoints = [...(lineup.waypoints ?? [])];
    const waypoint = waypoints[waypointIndex];
    if (waypoint === undefined) return undefined;
    waypoints[waypointIndex] = { ...waypoint, x: point.x, y: point.y };
    return [{ ...lineup, waypoints, isBuiltIn: false }];
  }

  const groupTarget = lineup.groupTarget ?? 'landing';
  const updateGroup = lineup.groupId !== undefined && target === groupTarget;
  const affected = updateGroup
    ? lineups.filter(
        (item) =>
          item.groupId === lineup.groupId && (item.groupTarget ?? 'landing') === groupTarget,
      )
    : [lineup];

  return affected.map((item) => {
    if (target === 'origin') {
      return {
        ...item,
        origin: { ...item.origin, x: point.x, y: point.y },
        isBuiltIn: false,
      };
    }

    const targetCallout = resolveCallout?.(point) ?? item.targetCallout;
    return {
      ...item,
      landing: { ...item.landing, x: point.x, y: point.y },
      ...(targetCallout === undefined ? {} : { targetCallout }),
      isBuiltIn: false,
    };
  });
}
