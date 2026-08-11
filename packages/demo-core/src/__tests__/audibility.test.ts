import { describe, expect, it } from 'vitest';
import {
  AUDIBLE_MAX_UNITS,
  audibleRadiusAt,
  audibleRadiusUnits,
  RUNNING_SPEED_UNITS,
  SILENT_SPEED_UNITS,
} from '../helpers/audibility';
import { asFrame, asPlayerSlot, FLAG_ALIVE, FLAG_WALKING } from '../schema';
import { atFrame, newTrack } from './helpers';

describe('audibleRadiusUnits', () => {
  it('gives a running player the model’s full radius', () => {
    expect(audibleRadiusUnits(RUNNING_SPEED_UNITS, false)).toBe(AUDIBLE_MAX_UNITS);
  });

  it('does not grow past the full radius above running speed', () => {
    expect(audibleRadiusUnits(RUNNING_SPEED_UNITS * 3, false)).toBe(AUDIBLE_MAX_UNITS);
  });

  it('silences a walking player however fast they are carried', () => {
    expect(audibleRadiusUnits(RUNNING_SPEED_UNITS, true)).toBe(0);
  });

  it('silences a player standing still, and one barely moving', () => {
    expect(audibleRadiusUnits(0, false)).toBe(0);
    expect(audibleRadiusUnits(SILENT_SPEED_UNITS, false)).toBe(0);
  });

  it('carries further the faster a player moves', () => {
    const half = audibleRadiusUnits(RUNNING_SPEED_UNITS / 2, false);

    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(AUDIBLE_MAX_UNITS);
    expect(half).toBeLessThan(audibleRadiusUnits(RUNNING_SPEED_UNITS * 0.75, false));
  });
});

describe('audibleRadiusAt', () => {
  it('reads the speed and the walk flag out of the track', () => {
    const track = newTrack();
    atFrame(track, asFrame(0), asPlayerSlot(0), {
      flags: FLAG_ALIVE,
      speed: RUNNING_SPEED_UNITS,
    });
    atFrame(track, asFrame(0), asPlayerSlot(1), {
      flags: FLAG_ALIVE | FLAG_WALKING,
      speed: RUNNING_SPEED_UNITS,
    });

    expect(audibleRadiusAt(track, 0)).toBe(AUDIBLE_MAX_UNITS);
    expect(audibleRadiusAt(track, 1)).toBe(0);
  });
});
