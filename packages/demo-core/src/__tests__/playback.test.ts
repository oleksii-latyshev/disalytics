import { describe, expect, it } from 'vitest';
import { advanceClock, createClock } from '../playback';
import { newTrack } from './helpers';

const SECOND_MS = 1000;

describe('createClock', () => {
  it('starts paused at real speed', () => {
    expect(createClock()).toEqual({ frame: 0, isPlaying: false, speed: 1 });
  });

  it('starts wherever the match is meant to open', () => {
    expect(createClock(42).frame).toBe(42);
  });
});

describe('advanceClock', () => {
  it('does not move a paused clock', () => {
    const track = newTrack({ sampleHz: 16, frameCount: 64 });
    const clock = createClock(10);

    advanceClock(clock, track, SECOND_MS);

    expect(clock.frame).toBe(10);
  });

  it('covers one second of samples in one second of real time', () => {
    const track = newTrack({ sampleHz: 16, frameCount: 64 });
    const clock = createClock();
    clock.isPlaying = true;

    advanceClock(clock, track, SECOND_MS);

    expect(clock.frame).toBe(16);
  });

  it('lands between samples on a part of a second', () => {
    const track = newTrack({ sampleHz: 16, frameCount: 64 });
    const clock = createClock();
    clock.isPlaying = true;

    advanceClock(clock, track, SECOND_MS / 32);

    expect(clock.frame).toBeCloseTo(0.5);
  });

  it('scales the distance covered by the speed', () => {
    const track = newTrack({ sampleHz: 16, frameCount: 256 });
    const clock = createClock();
    clock.isPlaying = true;
    clock.speed = 4;

    advanceClock(clock, track, SECOND_MS);

    expect(clock.frame).toBe(64);
    expect(clock.isPlaying).toBe(true);
  });

  it('stops on the last sample rather than running past it', () => {
    const track = newTrack({ sampleHz: 16, frameCount: 8 });
    const clock = createClock();
    clock.isPlaying = true;

    advanceClock(clock, track, SECOND_MS);

    expect(clock.frame).toBe(7);
    expect(clock.isPlaying).toBe(false);
  });

  it('has nowhere to go in an empty track', () => {
    const track = newTrack({ frameCount: 0 });
    const clock = createClock();
    clock.isPlaying = true;

    advanceClock(clock, track, SECOND_MS);

    expect(clock.frame).toBe(0);
    expect(clock.isPlaying).toBe(false);
  });
});
