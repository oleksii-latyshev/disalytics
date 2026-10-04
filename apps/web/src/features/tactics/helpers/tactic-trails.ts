import type { Tactic } from '@disa/demo-core';
import { getMapOverview, type RadarPoint } from '@disa/map-data';
import { tacticWorldToRadar } from './tactic-plot';

export interface TacticTrail {
  readonly d: string;
  readonly end: RadarPoint;
}

export interface TacticSketch {
  readonly trails: readonly TacticTrail[];
  readonly smokes: readonly RadarPoint[];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * The thumbnail of a tactic: where each player walks across the steps and where the smokes land,
 * in 1024² radar space. A player who never moves leaves no trail. An unknown map has no sketch.
 */
export function tacticSketch(tactic: Tactic): TacticSketch | null {
  const overview = getMapOverview(tactic.map);
  if (overview === undefined) return null;

  const bySlot = new Map<number, RadarPoint[]>();
  for (const step of tactic.steps) {
    for (const player of step.players) {
      const point = tacticWorldToRadar(overview, player);
      const trail = bySlot.get(player.slot) ?? [];
      const last = trail[trail.length - 1];
      if (last === undefined || last.x !== point.x || last.y !== point.y) trail.push(point);
      bySlot.set(player.slot, trail);
    }
  }

  const trails: TacticTrail[] = [];
  for (const points of bySlot.values()) {
    const end = points[points.length - 1];
    if (points.length < 2 || end === undefined) continue;
    trails.push({
      d: `M${points.map((p) => `${round(p.x)} ${round(p.y)}`).join(' L')}`,
      end: { x: round(end.x), y: round(end.y) },
    });
  }

  const smokes = tactic.steps.flatMap((step) =>
    step.throws
      .filter((grenade) => grenade.kind === 'smoke')
      .map((grenade) => tacticWorldToRadar(overview, grenade.to)),
  );

  return { trails, smokes };
}
