import { asTick, FLAG_ALIVE, type ParsedDemo, type Team, type WorldPoint } from '../schema';
import { frameForTick, sidesBySlotAtRound, slotSampleIndex } from './selectors';

/** Spawn spots of one map, keyed by the side that starts on them. */
export type SideSpawns = Readonly<Record<Team, readonly WorldPoint[]>>;

/** Two positions closer than this on the ground plane are the same spawn spot. */
export const SPAWN_MERGE_DISTANCE = 32;

/**
 * A round's first tick still shows some players where the last one left them; one second in, the
 * team has been moved onto its spawn spots and has not yet had time to walk off them.
 */
const SETTLE_SECONDS = 1;

/**
 * Where every living player stands when each round opens, grouped by the side the slot held in
 * that round. Freeze time starts with the whole team on spawn spots, so these are the spots —
 * with repeats, which `mergeSpawns` collapses.
 */
export function roundStartPositions(demo: ParsedDemo): Record<Team, WorldPoint[]> {
  const found: Record<Team, WorldPoint[]> = { CT: [], T: [] };
  const { track } = demo;

  demo.events.rounds.forEach((round, roundIndex) => {
    const settledTick = Math.min(
      round.startTick + Math.round(SETTLE_SECONDS * track.tickRate),
      round.freezeTimeEndTick,
    );
    const frame = frameForTick(track, asTick(settledTick));
    const sides = sidesBySlotAtRound(demo, roundIndex);
    for (let slot = 0; slot < track.slotCount; slot++) {
      const side = sides[slot];
      if (side === undefined) continue;
      const index = slotSampleIndex(track, frame, slot);
      if (((track.flags[index] ?? 0) & FLAG_ALIVE) === 0) continue;
      found[side].push({
        x: track.posX[index] ?? 0,
        y: track.posY[index] ?? 0,
        z: track.posZ[index] ?? 0,
      });
    }
  });

  return found;
}

/**
 * Collapses positions within `distance` of an earlier one, then orders them by x, y, z with
 * coordinates rounded to whole units, so the same input always yields the same list.
 */
export function mergeSpawns(
  positions: readonly WorldPoint[],
  distance: number = SPAWN_MERGE_DISTANCE,
): readonly WorldPoint[] {
  const ordered = positions
    .map((point) => ({ x: Math.round(point.x), y: Math.round(point.y), z: Math.round(point.z) }))
    .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);

  const kept: WorldPoint[] = [];
  for (const point of ordered) {
    const isRepeat = kept.some(
      (other) => Math.hypot(other.x - point.x, other.y - point.y) < distance,
    );
    if (!isRepeat) kept.push(point);
  }
  return kept;
}
