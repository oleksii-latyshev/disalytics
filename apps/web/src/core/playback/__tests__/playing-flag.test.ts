import type { TickTrack } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  bindPlayingFlag,
  PLAYING_ATTRIBUTE,
  type PlayingFlagTarget,
} from '../helpers/playing-flag';
import { createTransport } from '../helpers/transport';

function newTrack(frameCount: number): TickTrack {
  return {
    tickRate: 64,
    sampleHz: 16,
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

function newTarget(): PlayingFlagTarget & { readonly attributes: Map<string, string> } {
  const attributes = new Map<string, string>();

  return {
    attributes,
    setAttribute: (name, value) => void attributes.set(name, value),
    removeAttribute: (name) => void attributes.delete(name),
  };
}

describe('bindPlayingFlag', () => {
  it('leaves a paused transport unflagged', () => {
    const target = newTarget();

    bindPlayingFlag(createTransport(newTrack(64), 0), target);

    expect(target.attributes.has(PLAYING_ATTRIBUTE)).toBe(false);
  });

  it('flags a transport that was already playing when it was bound', () => {
    const transport = createTransport(newTrack(64), 0);
    const target = newTarget();
    transport.play();

    bindPlayingFlag(transport, target);

    expect(target.attributes.get(PLAYING_ATTRIBUTE)).toBe('');
  });

  it('sets the flag on play and clears it on pause', () => {
    const transport = createTransport(newTrack(64), 0);
    const target = newTarget();
    bindPlayingFlag(transport, target);

    transport.play();
    expect(target.attributes.get(PLAYING_ATTRIBUTE)).toBe('');

    transport.pause();
    expect(target.attributes.has(PLAYING_ATTRIBUTE)).toBe(false);
  });

  it('clears the flag when playback stops at the end of the match on its own', () => {
    const transport = createTransport(newTrack(8), 0);
    const target = newTarget();
    bindPlayingFlag(transport, target);
    transport.play();

    transport.advance(1000);

    expect(transport.clock.isPlaying).toBe(false);
    expect(target.attributes.has(PLAYING_ATTRIBUTE)).toBe(false);
  });

  it('clears the flag on unbind, so a closed demo does not leave the interface frozen', () => {
    const transport = createTransport(newTrack(64), 0);
    const target = newTarget();
    const unbind = bindPlayingFlag(transport, target);
    transport.play();

    unbind();

    expect(target.attributes.has(PLAYING_ATTRIBUTE)).toBe(false);
  });

  it('stops listening on unbind', () => {
    const transport = createTransport(newTrack(64), 0);
    const target = newTarget();
    const unbind = bindPlayingFlag(transport, target);

    unbind();
    transport.play();

    expect(target.attributes.has(PLAYING_ATTRIBUTE)).toBe(false);
  });
});
