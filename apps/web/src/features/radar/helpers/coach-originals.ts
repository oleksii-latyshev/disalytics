import {
  asPlayerSlot,
  FLAG_ALIVE,
  type ParsedDemo,
  type PlayerSlot,
  sampleAt,
  type Team,
} from '@disa/demo-core';
import { type MapOverview, plateX, plateY, type RadarPoint } from '@disa/map-data';
import { POSITION_STRIDE, positionScratch, readPositions } from '@/core/playback';

export function playerPointsAtFrame(
  demo: ParsedDemo,
  overview: MapOverview,
  frame: number,
  teamBySlot: readonly (Team | undefined)[],
): ReadonlyMap<PlayerSlot, RadarPoint> {
  const points = new Map<PlayerSlot, RadarPoint>();
  const positions = positionScratch(demo.track);
  const base = readPositions(demo.track, frame, positions) * demo.track.slotCount;

  for (let slot = 0; slot < demo.track.slotCount; slot++) {
    if (teamBySlot[slot] === undefined) continue;
    if ((sampleAt(demo.track.flags, base + slot) & FLAG_ALIVE) === 0) continue;

    const worldX = positions[slot * POSITION_STRIDE];
    const worldY = positions[slot * POSITION_STRIDE + 1];
    const worldZ = positions[slot * POSITION_STRIDE + 2];
    if (worldX === undefined || worldY === undefined || worldZ === undefined) continue;

    points.set(asPlayerSlot(slot), {
      x: plateX(overview, worldX, worldZ),
      y: plateY(overview, worldY, worldZ),
    });
  }

  return points;
}
