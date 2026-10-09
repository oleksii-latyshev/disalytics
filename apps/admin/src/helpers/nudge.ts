import type { WorldPoint } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';

const DIRECTION: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

export function isNudgeKey(key: string): boolean {
  return Object.hasOwn(DIRECTION, key);
}

/** Where an arrow key puts a point: a radar pixel along it, or eight with Shift. Up is north. */
export function nudgedPoint(
  overview: MapOverview,
  point: WorldPoint,
  key: string,
  isLarge: boolean,
): WorldPoint {
  const direction = DIRECTION[key];
  if (direction === undefined) return point;
  const units = (isLarge ? 8 : 1) * overview.scale;
  return { ...point, x: point.x + direction[0] * units, y: point.y + direction[1] * units };
}
