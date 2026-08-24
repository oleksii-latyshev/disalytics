import { asFrame, type TickTrack, WEAPON_NONE } from '@disa/demo-core';
import { describe, expect, it, vi } from 'vitest';
import { createTransport } from '../helpers/transport';

const SAMPLE_HZ = 16;
const SECOND_MS = 1000;

function newTrack(frameCount: number): TickTrack {
  return {
    tickRate: 64,
    sampleHz: SAMPLE_HZ,
    frameCount,
    slotCount: 1,
    posX: new Float32Array(frameCount),
    posY: new Float32Array(frameCount),
    posZ: new Float32Array(frameCount),
    yaw: new Int16Array(frameCount),
    pitch: new Int16Array(frameCount),
    health: new Uint8Array(frameCount),
    flags: new Uint8Array(frameCount),
    speed: new Uint16Array(frameCount),
    armour: new Uint8Array(frameCount),
    weapon: new Uint8Array(frameCount).fill(WEAPON_NONE),
    grenades: new Uint8Array(frameCount),
    money: new Uint16Array(frameCount),
  };
}

describe('createTransport', () => {
  it('opens paused on the frame it was given', () => {
    const transport = createTransport(newTrack(64), 20);

    expect(transport.clock).toEqual({ frame: 20, isPlaying: false, speed: 1, scrub: null });
  });

  it('leaves the clock alone while paused', () => {
    const transport = createTransport(newTrack(64), 20);

    transport.advance(SECOND_MS);

    expect(transport.clock.frame).toBe(20);
  });

  it('rewinds when play is pressed at the end of the match', () => {
    const transport = createTransport(newTrack(64), 63);

    transport.play();

    expect(transport.clock.frame).toBe(0);
    expect(transport.clock.isPlaying).toBe(true);
  });

  it('tells transport subscribers when playback stops at the end on its own', () => {
    const transport = createTransport(newTrack(8), 0);
    const listener = vi.fn();

    transport.play();
    transport.subscribeToTransport(listener);
    transport.advance(SECOND_MS);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(transport.clock.isPlaying).toBe(false);
  });

  it('does not tell them about an ordinary frame', () => {
    const transport = createTransport(newTrack(1024), 0);
    const listener = vi.fn();

    transport.play();
    transport.subscribeToTransport(listener);
    transport.advance(SECOND_MS);

    expect(listener).not.toHaveBeenCalled();
  });

  it('draws every frame, including the one playback stops on', () => {
    const transport = createTransport(newTrack(8), 0);
    const paint = vi.fn();

    transport.subscribeToFrames(paint);
    transport.play();
    transport.advance(SECOND_MS);

    expect(paint).toHaveBeenCalledTimes(2);
  });

  it('stops drawing once unsubscribed', () => {
    const transport = createTransport(newTrack(1024), 0);
    const paint = vi.fn();

    const unsubscribe = transport.subscribeToFrames(paint);
    unsubscribe();
    transport.play();
    transport.advance(SECOND_MS);

    expect(paint).not.toHaveBeenCalled();
  });

  it('toggles between playing and paused', () => {
    const transport = createTransport(newTrack(64), 0);

    transport.toggle();
    expect(transport.clock.isPlaying).toBe(true);

    transport.toggle();
    expect(transport.clock.isPlaying).toBe(false);
  });

  it('reports a speed change once, and only when it changes', () => {
    const transport = createTransport(newTrack(64), 0);
    const listener = vi.fn();
    transport.subscribeToTransport(listener);

    transport.setSpeed(2);
    transport.setSpeed(2);

    expect(transport.clock.speed).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('seek', () => {
  it('moves the clock without changing whether it plays', () => {
    const transport = createTransport(newTrack(64), 0);
    transport.play();

    transport.seek(20);

    expect(transport.clock.frame).toBe(20);
    expect(transport.clock.isPlaying).toBe(true);
  });

  it('clamps into the track at both ends', () => {
    const transport = createTransport(newTrack(64), 0);

    transport.seek(-40);
    expect(transport.clock.frame).toBe(0);

    transport.seek(4000);
    expect(transport.clock.frame).toBe(63);
  });

  it('keeps a position between two samples', () => {
    const transport = createTransport(newTrack(64), 0);

    transport.seek(20.5);

    expect(transport.clock.frame).toBe(20.5);
  });

  it('repaints, because the picture just changed', () => {
    const transport = createTransport(newTrack(64), 0);
    const paint = vi.fn();
    transport.subscribeToFrames(paint);

    transport.seek(20);

    expect(paint).toHaveBeenCalledTimes(1);
  });
});

describe('step', () => {
  it('moves one sample and stops playback', () => {
    const transport = createTransport(newTrack(64), 10);
    transport.play();

    transport.step(1);

    expect(transport.clock.frame).toBe(11);
    expect(transport.clock.isPlaying).toBe(false);
  });

  it('steps off the nearest sample when the clock sits between two', () => {
    const transport = createTransport(newTrack(64), 12.7);

    transport.step(-1);

    expect(transport.clock.frame).toBe(12);
  });

  it('has nowhere to go back from the first sample', () => {
    const transport = createTransport(newTrack(64), 0);

    transport.step(-1);

    expect(transport.clock.frame).toBe(0);
  });

  it('has nowhere to go forward from the last sample', () => {
    const transport = createTransport(newTrack(64), 63);

    transport.step(1);

    expect(transport.clock.frame).toBe(63);
  });
});

describe('resume', () => {
  it('plays on from the end instead of rewinding to the start', () => {
    const transport = createTransport(newTrack(64), 63);

    transport.resume();

    expect(transport.clock.frame).toBe(63);
    expect(transport.clock.isPlaying).toBe(true);
  });
});

describe('setFrameSkip', () => {
  it('moves the clock where the rule says, once playback has advanced it', () => {
    const transport = createTransport(newTrack(64), 0);
    transport.setFrameSkip((frame) => (frame < 32 ? asFrame(32) : null));

    transport.play();
    transport.advance(SECOND_MS);

    expect(transport.clock.frame).toBe(32);
  });

  it('leaves a seek alone, so what playback skips is still reachable by hand', () => {
    const transport = createTransport(newTrack(64), 0);
    transport.setFrameSkip((frame) => (frame < 32 ? asFrame(32) : null));

    transport.seek(8);
    expect(transport.clock.frame).toBe(8);

    transport.step(1);
    expect(transport.clock.frame).toBe(9);
  });

  it('stops obeying a rule that has been taken away', () => {
    const transport = createTransport(newTrack(64), 0);
    transport.setFrameSkip((frame) => (frame < 32 ? asFrame(32) : null));
    transport.setFrameSkip(null);

    transport.play();
    transport.advance(SECOND_MS);

    expect(transport.clock.frame).toBe(SAMPLE_HZ);
  });
});

describe('holdScrub', () => {
  it('runs the clock at the held rate without touching the chosen speed', () => {
    const transport = createTransport(newTrack(1024), 100);
    transport.setSpeed(0.5);

    transport.holdScrub(-2);
    transport.advance(SECOND_MS);

    expect(transport.clock.frame).toBe(100 - 2 * SAMPLE_HZ);
    expect(transport.clock.speed).toBe(0.5);
  });

  it('moves a paused match, and releasing it pauses again', () => {
    const transport = createTransport(newTrack(1024), 100);

    transport.holdScrub(2);
    transport.advance(SECOND_MS);
    transport.releaseScrub();

    expect(transport.clock.frame).toBe(100 + 2 * SAMPLE_HZ);
    expect(transport.clock.isPlaying).toBe(false);
    expect(transport.clock.scrub).toBeNull();
  });

  it('gives a playing match back its own rate on release', () => {
    const transport = createTransport(newTrack(1024), 100);
    transport.setSpeed(2);
    transport.play();

    transport.holdScrub(-4);
    transport.releaseScrub();
    transport.advance(SECOND_MS);

    expect(transport.clock.isPlaying).toBe(true);
    expect(transport.clock.frame).toBe(100 + 2 * SAMPLE_HZ);
  });

  it('holds once however many times the key repeats', () => {
    const transport = createTransport(newTrack(1024), 100);
    transport.play();

    transport.holdScrub(2);
    transport.holdScrub(2);
    transport.holdScrub(2);
    transport.releaseScrub();

    expect(transport.clock.isPlaying).toBe(true);
  });

  it('ignores a release nothing is holding', () => {
    const transport = createTransport(newTrack(1024), 100);

    transport.releaseScrub();

    expect(transport.clock.isPlaying).toBe(false);
  });

  it('is ended by a pause rather than outliving it', () => {
    const transport = createTransport(newTrack(1024), 100);

    transport.holdScrub(2);
    transport.pause();
    transport.releaseScrub();

    expect(transport.clock.scrub).toBeNull();
    expect(transport.clock.isPlaying).toBe(false);
  });

  it('scrubs into what the buy-phase rule skips, the way a seek does', () => {
    const transport = createTransport(newTrack(64), 40);
    transport.setFrameSkip((frame) => (frame < 32 ? asFrame(32) : null));

    transport.holdScrub(-2);
    transport.advance(SECOND_MS);

    expect(transport.clock.frame).toBe(8);
  });
});
