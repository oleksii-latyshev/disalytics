import { mainSteps, type Tactic } from '@disa/demo-core';
import { getMapOverview, type MapOverview, type RadarPoint } from '@disa/map-data';
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

function pushDistinct(trail: RadarPoint[], point: RadarPoint): void {
  const last = trail[trail.length - 1];
  if (last === undefined || last.x !== point.x || last.y !== point.y) trail.push(point);
}

/** Every slot's spawn followed by the waypoints of its routes, step after step, in radar pixels. */
function routePoints(tactic: Tactic, overview: MapOverview): Map<number, RadarPoint[]> {
  const bySlot = new Map<number, RadarPoint[]>();
  for (const [slot, spawn] of tactic.spawns.entries()) {
    bySlot.set(slot, [tacticWorldToRadar(overview, spawn)]);
  }
  for (const step of mainSteps(tactic)) {
    for (const player of step.players) {
      const trail = bySlot.get(player.slot) ?? [];
      for (const waypoint of player.route.points) {
        pushDistinct(trail, tacticWorldToRadar(overview, waypoint));
      }
      bySlot.set(player.slot, trail);
    }
  }
  return bySlot;
}

/**
 * The thumbnail of a tactic: where each player walks across the steps and where the smokes land,
 * in 1024² radar space. A player who never moves leaves no trail. An unknown map has no sketch.
 */
export function tacticSketch(tactic: Tactic): TacticSketch | null {
  const overview = getMapOverview(tactic.map);
  if (overview === undefined) return null;

  const bySlot = routePoints(tactic, overview);

  const trails: TacticTrail[] = [];
  for (const points of bySlot.values()) {
    const end = points[points.length - 1];
    if (points.length < 2 || end === undefined) continue;
    trails.push({
      d: `M${points.map((p) => `${round(p.x)} ${round(p.y)}`).join(' L')}`,
      end: { x: round(end.x), y: round(end.y) },
    });
  }

  const smokes = mainSteps(tactic).flatMap((step) =>
    step.throws
      .filter((grenade) => grenade.kind === 'smoke')
      .map((grenade) => tacticWorldToRadar(overview, grenade.to)),
  );

  return { trails, smokes };
}
