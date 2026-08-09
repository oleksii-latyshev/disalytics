import { asFrame, FLAG_ALIVE, type TickTrack } from '@disa/demo-core';
import { MAP_OVERVIEWS } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { busiestLevelIndex, levelAt, levelIndexAt } from '../helpers/levels';

const dust2 = MAP_OVERVIEWS.de_dust2;
const nuke = MAP_OVERVIEWS.de_nuke;

const UPPER_Z = 0;
const LOWER_Z = -600;

function newTrack(slotCount: number): TickTrack {
  return {
    tickRate: 64,
    sampleHz: 16,
    frameCount: 1,
    slotCount,
    posX: new Float32Array(slotCount),
    posY: new Float32Array(slotCount),
    posZ: new Float32Array(slotCount),
    yaw: new Int16Array(slotCount),
    pitch: new Int16Array(slotCount),
    health: new Uint8Array(slotCount),
    flags: new Uint8Array(slotCount),
    speed: new Uint16Array(slotCount),
  };
}

function withPlayers(altitudes: readonly (number | null)[]): TickTrack {
  const track = newTrack(altitudes.length);

  for (const [slot, z] of altitudes.entries()) {
    if (z === null) continue;
    track.posZ[slot] = z;
    track.flags[slot] = FLAG_ALIVE;
  }

  return track;
}

describe('levelIndexAt', () => {
  it('keeps a single-level map on its only level', () => {
    expect(levelIndexAt(dust2, 5000)).toBe(0);
    expect(levelIndexAt(dust2, -5000)).toBe(0);
  });

  it('answers the position of the level in the overview', () => {
    expect(levelIndexAt(nuke, UPPER_Z)).toBe(0);
    expect(levelIndexAt(nuke, LOWER_Z)).toBe(1);
  });
});

describe('levelAt', () => {
  it('falls back to the default level for an index the map does not have', () => {
    expect(levelAt(nuke, 7).image).toBe('de_nuke');
    expect(levelAt(nuke, 1).image).toBe('de_nuke_lower');
  });
});

describe('busiestLevelIndex', () => {
  const frame = asFrame(0);

  it('opens a single-level map on its only level whatever the altitudes are', () => {
    expect(busiestLevelIndex(dust2, withPlayers([LOWER_Z, LOWER_Z]), frame)).toBe(0);
  });

  it('follows the majority of the living players', () => {
    const track = withPlayers([LOWER_Z, LOWER_Z, LOWER_Z, UPPER_Z, UPPER_Z]);

    expect(busiestLevelIndex(nuke, track, frame)).toBe(1);
  });

  it('ignores the dead', () => {
    const track = withPlayers([LOWER_Z, LOWER_Z, UPPER_Z]);
    track.flags[0] = 0;
    track.flags[1] = 0;

    expect(busiestLevelIndex(nuke, track, frame)).toBe(0);
  });

  it('keeps the default level when the sides are evenly split', () => {
    const track = withPlayers([UPPER_Z, LOWER_Z]);

    expect(busiestLevelIndex(nuke, track, frame)).toBe(0);
  });

  it('keeps the default level when nobody is alive', () => {
    expect(busiestLevelIndex(nuke, withPlayers([null, null]), frame)).toBe(0);
  });

  it('keeps the default level for a track with no samples', () => {
    const track = { ...newTrack(2), frameCount: 0 };

    expect(busiestLevelIndex(nuke, track, frame)).toBe(0);
  });
});
