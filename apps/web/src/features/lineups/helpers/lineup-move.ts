import type { Lineup } from '@disa/demo-core';
import { findNearestCallout } from '@disa/map-data';
import {
  type LineupPointCoordinates,
  type LineupPointTarget,
  updateLineupsAtPoint,
} from './update-lineup-point';

/** One point of one lineup taken somewhere else. */
export interface PointMove {
  readonly lineupId: string;
  readonly target: LineupPointTarget;
  readonly waypointIndex?: number;
  readonly point: LineupPointCoordinates;
}

/** The lineups a move changes — a shared landing or throw spot takes its whole group along. */
export function movedLineups(
  lineups: readonly Lineup[],
  move: PointMove,
  map: string | null,
): readonly Lineup[] {
  return (
    updateLineupsAtPoint({
      lineups,
      lineupId: move.lineupId,
      target: move.target,
      point: move.point,
      ...(move.waypointIndex === undefined ? {} : { waypointIndex: move.waypointIndex }),
      ...(map === null
        ? {}
        : { resolveCallout: (point: LineupPointCoordinates) => findNearestCallout(map, point) }),
    }) ?? []
  );
}

/** The lineups as they are with a move in progress: the changed ones replace their old selves. */
export function withMove(lineups: readonly Lineup[], move: PointMove | null): readonly Lineup[] {
  if (move === null) return lineups;

  const changed = new Map(movedLineups(lineups, move, null).map((lineup) => [lineup.id, lineup]));

  return lineups.map((lineup) => changed.get(lineup.id) ?? lineup);
}
