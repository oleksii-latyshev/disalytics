import { asFrame, asPlayerSlot, type TickTrack, WEAPON_NONE } from '@disa/demo-core';
import { MAP_OVERVIEWS, radarX, radarY } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import type { KillLine } from '@/core/events';
import { END_STRIDE, killLineGeometry } from '../helpers/kill-line';
import { OTHER_LEVEL_ALPHA } from '../helpers/levels';

const dust2 = MAP_OVERVIEWS.de_dust2;
const nuke = MAP_OVERVIEWS.de_nuke;

const UPPER_Z = 0;
const LOWER_Z = -600;

const SLOT_COUNT = 2;
const FRAME_COUNT = 2;

interface Position {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

/** Two slots over two frames, so a read at one frame can be told from a read at the other. */
function newTrack(frames: readonly (readonly [Position, Position])[]): TickTrack {
  const length = FRAME_COUNT * SLOT_COUNT;
  const track: TickTrack = {
    tickRate: 64,
    sampleHz: 16,
    frameCount: FRAME_COUNT,
    slotCount: SLOT_COUNT,
    posX: new Float32Array(length),
    posY: new Float32Array(length),
    posZ: new Float32Array(length),
    yaw: new Int16Array(length),
    pitch: new Int16Array(length),
    health: new Uint8Array(length),
    flags: new Uint8Array(length),
    speed: new Uint16Array(length),
    armour: new Uint8Array(length),
    weapon: new Uint8Array(length).fill(WEAPON_NONE),
    grenades: new Uint8Array(length),
    money: new Uint16Array(length),
  };

  for (const [frame, slots] of frames.entries()) {
    for (const [slot, position] of slots.entries()) {
      const sample = frame * SLOT_COUNT + slot;
      track.posX[sample] = position.x;
      track.posY[sample] = position.y;
      track.posZ[sample] = position.z ?? UPPER_Z;
    }
  }

  return track;
}

function newKillLine(frame: number): KillLine {
  return {
    frame: asFrame(frame),
    attacker: asPlayerSlot(0),
    victim: asPlayerSlot(1),
    attackerSide: 'CT',
    victimSide: 'T',
  };
}

const AT_KILL: readonly [Position, Position] = [
  { x: 100, y: 200 },
  { x: 300, y: 400 },
];

const LATER: readonly [Position, Position] = [
  { x: 5000, y: 5000 },
  { x: 6000, y: 6000 },
];

describe('killLineGeometry', () => {
  it("reads both ends at the kill's own frame rather than at the playhead", () => {
    const geometry = killLineGeometry(newTrack([AT_KILL, LATER]), dust2, 0);

    geometry.read(newKillLine(0), 1);

    // `toBeCloseTo` rather than an equality: the columns are `Float32Array`, so a world coordinate
    // comes back through 32-bit precision while the expectation is computed in 64.
    expect(geometry.ends[0]).toBeCloseTo(radarX(dust2, 100));
    expect(geometry.ends[1]).toBeCloseTo(radarY(dust2, 200));
    expect(geometry.ends[END_STRIDE]).toBeCloseTo(radarX(dust2, 300));
    expect(geometry.ends[END_STRIDE + 1]).toBeCloseTo(radarY(dust2, 400));
  });

  it('scales both ends with the plate', () => {
    const geometry = killLineGeometry(newTrack([AT_KILL, LATER]), dust2, 0);

    geometry.read(newKillLine(0), 1);
    const [x, y] = Array.from(geometry.ends);

    geometry.read(newKillLine(0), 2);

    expect(geometry.ends[0]).toBeCloseTo((x ?? 0) * 2);
    expect(geometry.ends[1]).toBeCloseTo((y ?? 0) * 2);
  });

  it('fades an end standing on a level the map is not showing', () => {
    const frame: readonly [Position, Position] = [
      { x: 100, y: 200, z: UPPER_Z },
      { x: 300, y: 400, z: LOWER_Z },
    ];
    const geometry = killLineGeometry(newTrack([frame, frame]), nuke, 0);

    geometry.read(newKillLine(0), 1);

    expect(geometry.ends[2]).toBe(1);
    expect(geometry.ends[END_STRIDE + 2]).toBe(OTHER_LEVEL_ALPHA);
  });

  it('rewrites its own scratch rather than handing back a new array', () => {
    const geometry = killLineGeometry(newTrack([AT_KILL, LATER]), dust2, 0);
    const { ends } = geometry;

    geometry.read(newKillLine(0), 1);
    geometry.read(newKillLine(1), 1);

    expect(geometry.ends).toBe(ends);
    expect(ends[0]).toBeCloseTo(radarX(dust2, 5000));
  });
});
