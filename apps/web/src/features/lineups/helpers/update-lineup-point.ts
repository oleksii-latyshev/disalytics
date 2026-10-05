import type { Lineup, WorldPoint } from '@disa/demo-core';

export interface LineupPointCoordinates {
  readonly x: number;
  readonly y: number;
  /** Given where the point may be on another floor; absent, the point keeps the altitude it had. */
  readonly z?: number | undefined;
}

function movedTo(from: WorldPoint, point: LineupPointCoordinates): WorldPoint {
  return { ...from, x: point.x, y: point.y, ...(point.z === undefined ? {} : { z: point.z }) };
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
    waypoints[waypointIndex] = movedTo(waypoint, point);
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
        origin: movedTo(item.origin, point),
        isBuiltIn: false,
      };
    }

    const targetCallout = resolveCallout?.(point) ?? item.targetCallout;
    return {
      ...item,
      landing: movedTo(item.landing, point),
      ...(targetCallout === undefined ? {} : { targetCallout }),
      isBuiltIn: false,
    };
  });
}
