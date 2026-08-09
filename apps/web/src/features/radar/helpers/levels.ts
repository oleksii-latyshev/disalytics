import { FLAG_ALIVE, type Frame, sampleAt, type TickTrack } from '@disa/demo-core';
import { type MapOverview, type RadarLevel, radarLevelAt } from '@disa/map-data';

/** The level a player at altitude `z` belongs to, as a position in the overview's own order. */
export function levelIndexAt(overview: MapOverview, z: number): number {
  const index = overview.levels.indexOf(radarLevelAt(overview, z));

  return index === -1 ? 0 : index;
}

export function levelAt(overview: MapOverview, index: number): RadarLevel {
  return overview.levels[index] ?? overview.levels[0];
}

/**
 * The level the map should show — the one carrying most of the living players at `frame`. Ties keep
 * the lower index, so a map whose players are evenly split stays on its default level.
 */
export function busiestLevelIndex(overview: MapOverview, track: TickTrack, frame: Frame): number {
  if (overview.levels.length === 1 || track.frameCount === 0) return 0;

  const base = frame * track.slotCount;
  let busiest = 0;
  let mostPlayers = 0;

  for (const [index] of overview.levels.entries()) {
    let players = 0;

    for (let slot = 0; slot < track.slotCount; slot++) {
      const sample = base + slot;
      if ((sampleAt(track.flags, sample) & FLAG_ALIVE) === 0) continue;
      if (levelIndexAt(overview, sampleAt(track.posZ, sample)) === index) players++;
    }

    if (players > mostPlayers) {
      busiest = index;
      mostPlayers = players;
    }
  }

  return busiest;
}
