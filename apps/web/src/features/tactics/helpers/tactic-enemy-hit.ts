import type { TacticEnemy } from '@disa/demo-core';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import { toRadar } from './tactic-route';

/** Screen pixels within which a pointer counts as being on an enemy mark. */
export const ENEMY_HIT_PX = 17;

/** The enemy mark under the pointer, nearest first; null when none is. */
export function enemyAt(
  enemies: readonly TacticEnemy[],
  pointer: RadarPoint,
  overview: MapOverview,
  scale: number,
): string | null {
  let best: string | null = null;
  let bestDistance = ENEMY_HIT_PX / scale;
  for (const enemy of enemies) {
    const at = toRadar(overview, enemy.at);
    const d = Math.hypot(at.x - pointer.x, at.y - pointer.y);
    if (d <= bestDistance) {
      bestDistance = d;
      best = enemy.id;
    }
  }
  return best;
}
