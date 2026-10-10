import type { Lineup, TacticStep } from '@disa/demo-core';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import { toRadar } from './tactic-route';
import type { StepSchedule } from './tactic-schedule';

/** Screen pixels within which a pointer counts as being on a mark. */
export const HANDLE_HIT_PX = 11;
export const TOKEN_HIT_PX = 18;
export const LINEUP_HIT_PX = 14;

function distance(a: RadarPoint, b: RadarPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The waypoint of a points route under the pointer, as its index; null when none is. */
export function handleAt(
  step: TacticStep | undefined,
  slot: number | null,
  pointer: RadarPoint,
  overview: MapOverview,
  scale: number,
): number | null {
  const player = step?.players.find((entry) => entry.slot === slot);
  if (player === undefined || player.route.mode !== 'points') return null;

  let best: number | null = null;
  let bestDistance = HANDLE_HIT_PX / scale;
  player.route.points.forEach((point, index) => {
    const d = distance(toRadar(overview, point), pointer);
    if (d <= bestDistance) {
      bestDistance = d;
      best = index;
    }
  });
  return best;
}

/** The player whose token stands under the pointer at the start of the step. */
export function tokenAt(
  step: StepSchedule | undefined,
  pointer: RadarPoint,
  scale: number,
): number | null {
  let best: number | null = null;
  let bestDistance = TOKEN_HIT_PX / scale;
  for (const leg of step?.legs ?? []) {
    const d = distance({ x: leg.xs[0] ?? 0, y: leg.ys[0] ?? 0 }, pointer);
    if (d <= bestDistance) {
      bestDistance = d;
      best = leg.slot;
    }
  }
  return best;
}

/**
 * The lineup whose landing mark is under the pointer. Where several land on the same spot, the one
 * thrown from nearest to the player wins, since that is the one they can reach soonest.
 */
export function lineupAt(
  lineups: readonly Lineup[],
  pointer: RadarPoint,
  playerAt: RadarPoint,
  overview: MapOverview,
  scale: number,
): Lineup | null {
  let best: Lineup | null = null;
  let bestOrigin = Number.POSITIVE_INFINITY;
  for (const lineup of lineups) {
    if (distance(toRadar(overview, lineup.landing), pointer) > LINEUP_HIT_PX / scale) continue;
    const origin = distance(toRadar(overview, lineup.origin), playerAt);
    if (origin < bestOrigin) {
      bestOrigin = origin;
      best = lineup;
    }
  }
  return best;
}
