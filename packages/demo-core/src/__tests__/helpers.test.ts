import { describe, expect, it } from 'vitest';
import { ANGLE_SCALE, asFrame, asPlayerSlot, asTick, FLAG_ALIVE } from '../schema';
import { atFrame, newEvents, newTrack, withGrenade, withKill } from './helpers';

describe('newTrack', () => {
  it('allocates every buffer at frameCount x slotCount', () => {
    const track = newTrack({ frameCount: 4, slotCount: 2 });

    expect(track.posX.length).toBe(8);
    expect(track.yaw.length).toBe(8);
    expect(track.speed.length).toBe(8);
  });

  it('starts zeroed, which reads as a dead player at the origin', () => {
    const track = newTrack({ frameCount: 1, slotCount: 1 });

    expect(track.health[0]).toBe(0);
    expect(track.flags[0]).toBe(0);
    expect(track.posX[0]).toBe(0);
  });
});

describe('atFrame', () => {
  it('writes at frame * slotCount + slot', () => {
    const track = newTrack({ frameCount: 4, slotCount: 2 });

    atFrame(track, asFrame(3), asPlayerSlot(1), { health: 42 });

    expect(track.health[7]).toBe(42);
    expect(track.health[6]).toBe(0);
  });

  it('takes angles in degrees and stores them scaled', () => {
    const track = newTrack({ frameCount: 1, slotCount: 1 });

    atFrame(track, asFrame(0), asPlayerSlot(0), { yawDegrees: -179, pitchDegrees: 89 });

    expect(track.yaw[0]).toBe(-179 * ANGLE_SCALE);
    expect(track.pitch[0]).toBe(89 * ANGLE_SCALE);
  });

  it('leaves fields it was not given alone', () => {
    const track = newTrack({ frameCount: 1, slotCount: 1 });

    atFrame(track, asFrame(0), asPlayerSlot(0), { health: 100, flags: FLAG_ALIVE });
    atFrame(track, asFrame(0), asPlayerSlot(0), { health: 30 });

    expect(track.health[0]).toBe(30);
    expect(track.flags[0]).toBe(FLAG_ALIVE);
  });

  it('rejects a frame or slot outside the track', () => {
    const track = newTrack({ frameCount: 2, slotCount: 2 });

    expect(() => atFrame(track, asFrame(2), asPlayerSlot(0), {})).toThrow(RangeError);
    expect(() => atFrame(track, asFrame(-1), asPlayerSlot(0), {})).toThrow(RangeError);
    expect(() => atFrame(track, asFrame(0), asPlayerSlot(2), {})).toThrow(RangeError);
  });
});

describe('newEvents', () => {
  it('holds every event group, all empty', () => {
    const events = newEvents();

    expect(Object.values(events).every((group) => group.length === 0)).toBe(true);
  });
});

describe('withKill', () => {
  it('keeps the kills sorted by tick whatever order they were added in', () => {
    const events = withKill(withKill(withKill(newEvents(), { tick: asTick(200) }), {}), {
      tick: asTick(100),
    });

    expect(events.kills.map((kill) => kill.tick)).toEqual([0, 100, 200]);
  });

  it('fills the fields the test did not name', () => {
    const [kill] = withKill(newEvents(), { isHeadshot: true }).kills;

    expect(kill?.isHeadshot).toBe(true);
    expect(kill?.victim).toBe(1);
    expect(kill?.assister).toBeNull();
  });
});

describe('withGrenade', () => {
  it('sorts by throw tick and leaves the other groups untouched', () => {
    const events = withGrenade(withGrenade(newEvents(), { throwTick: asTick(64) }), {
      throwTick: asTick(32),
      type: 'flashbang',
    });

    expect(events.grenades.map((grenade) => grenade.throwTick)).toEqual([32, 64]);
    expect(events.kills).toHaveLength(0);
  });

  it('gives a grenade an empty trajectory rather than none', () => {
    const [grenade] = withGrenade(newEvents()).grenades;

    expect(grenade?.trajectory.sampleCount).toBe(0);
    expect(grenade?.trajectory.x).toHaveLength(0);
  });
});
