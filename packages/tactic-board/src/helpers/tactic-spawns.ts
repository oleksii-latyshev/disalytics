import type { TacticPoint } from '@disa/demo-core';

/** How close a position must be to a spawn spot to count as standing on it, in world units. */
const SPOT_TOLERANCE_UNITS = 2;

/** The spot nearest `point` within `radius`, as its index in `spots`; null when none is close. */
export function nearestSpawnIndex(
  spots: readonly TacticPoint[],
  point: TacticPoint,
  radius: number = SPOT_TOLERANCE_UNITS,
): number | null {
  let best: number | null = null;
  let bestDistance = radius;
  spots.forEach((spot, index) => {
    const distance = Math.hypot(spot.x - point.x, spot.y - point.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
