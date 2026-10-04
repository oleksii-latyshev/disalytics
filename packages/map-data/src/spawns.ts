import type { Team, WorldPoint } from '@disa/demo-core';
import { MAP_SPAWNS } from './generated/spawns';

const NONE: readonly WorldPoint[] = [];

/** The spots a side stands on when a round opens; empty for a map nobody has measured yet. */
export function mapSpawns(map: string, side: Team): readonly WorldPoint[] {
  return Object.hasOwn(MAP_SPAWNS, map) ? (MAP_SPAWNS[map]?.[side] ?? NONE) : NONE;
}
