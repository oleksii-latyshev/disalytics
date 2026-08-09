import type { TickTrack } from '@disa/demo-core';
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
  };
}

describe('createTransport', () => {
  it('opens paused on the frame it was given', () => {
    const transport = createTransport(newTrack(64), 20);

    expect(transport.clock).toEqual({ frame: 20, isPlaying: false, speed: 1 });
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
