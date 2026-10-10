import type { TacticPoint, TacticStep } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import { toWorld } from './tactic-route';
import type { PlayerLeg, ScheduledThrow } from './tactic-schedule';

/** A spot of the thrower's route a hand throw can leave from: the step's start, or a waypoint. */
export type ThrowOrigin =
  | { readonly kind: 'start'; readonly at: TacticPoint }
  | { readonly kind: 'point'; readonly number: number; readonly at: TacticPoint }
  | { readonly kind: 'end'; readonly at: TacticPoint };

/** The start of the step, then every waypoint; a pen stroke offers only where it ends. */
export function throwOrigins(
  step: TacticStep | undefined,
  leg: PlayerLeg | undefined,
  overview: MapOverview,
): readonly ThrowOrigin[] {
  if (leg === undefined) return [];
  const start = toWorld(overview, { x: leg.xs[0] ?? 0, y: leg.ys[0] ?? 0 });
  const route = step?.players.find((player) => player.slot === leg.slot)?.route;
  const points = route?.points ?? [];
  const startOrigin: ThrowOrigin = { kind: 'start', at: start };
  if (route?.mode === 'pen') {
    const end = points[points.length - 1];
    return end === undefined ? [startOrigin] : [startOrigin, { kind: 'end', at: end }];
  }
  return [
    startOrigin,
    ...points.map((at, i): ThrowOrigin => ({ kind: 'point', number: i + 1, at })),
  ];
}

/** The origin a scheduled throw leaves from: the one nearest to where the plan throws it. */
export function originIndexOf(
  origins: readonly ThrowOrigin[],
  thrown: ScheduledThrow,
  overview: MapOverview,
): number {
  const from = toWorld(overview, { x: thrown.fromX, y: thrown.fromY });
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  origins.forEach((origin, i) => {
    const d = Math.hypot(origin.at.x - from.x, origin.at.y - from.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}
