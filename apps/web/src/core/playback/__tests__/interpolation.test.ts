import { FLAG_ALIVE, type TickTrack } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { POSITION_STRIDE, positionScratch, readPositions } from '../helpers/interpolation';

const SAMPLE_HZ = 16;

/** One slot, moving along X, alive at both samples unless a test says otherwise. */
function newTrack(xs: readonly number[]): TickTrack {
  const frameCount = xs.length;

  const track: TickTrack = {
    tickRate: 64,
    sampleHz: SAMPLE_HZ,
    frameCount,
    slotCount: 1,
    posX: Float32Array.from(xs),
    posY: new Float32Array(frameCount),
    posZ: new Float32Array(frameCount),
    yaw: new Int16Array(frameCount),
    pitch: new Int16Array(frameCount),
    health: new Uint8Array(frameCount),
    flags: new Uint8Array(frameCount).fill(FLAG_ALIVE),
    speed: new Uint16Array(frameCount),
  };

  return track;
}

function xAt(track: TickTrack, frame: number): number {
  const out = positionScratch(track);
  readPositions(track, frame, out);

  return out[0] ?? Number.NaN;
}

describe('readPositions', () => {
  it('reads a sample exactly on it', () => {
    expect(xAt(newTrack([0, 40, 80]), 1)).toBe(40);
  });

  it('reads between two samples', () => {
    expect(xAt(newTrack([0, 40, 80]), 0.25)).toBeCloseTo(10);
  });

  it('holds the last sample past the end of the track', () => {
    expect(xAt(newTrack([0, 40, 80]), 5)).toBe(80);
  });

  it('holds the first sample below the start of the track', () => {
    expect(xAt(newTrack([0, 40, 80]), -3)).toBe(0);
  });

  it('snaps rather than sliding across a teleport', () => {
    const track = newTrack([0, 4000]);

    expect(xAt(track, 0.5)).toBe(0);
  });

  it('holds a dead player where the earlier sample left them', () => {
    const track = newTrack([0, 40]);
    track.flags[1] = 0;

    expect(xAt(track, 0.5)).toBe(0);
  });

  it('answers the sample the discrete columns are read from', () => {
    const track = newTrack([0, 40, 80]);

    expect(readPositions(track, 1.75, positionScratch(track))).toBe(1);
  });

  it('leaves the scratch buffer alone for a track with no samples', () => {
    const track = newTrack([]);
    const out = new Float32Array(POSITION_STRIDE);

    expect(readPositions(track, 0, out)).toBe(0);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });
});
