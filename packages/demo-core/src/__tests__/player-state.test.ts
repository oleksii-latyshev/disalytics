import { describe, expect, it } from 'vitest';
import {
  blindRemainingBySlot,
  bombProgressAt,
  DAMAGE_FLASH_SECONDS,
  DEATH_SHRINK_SECONDS,
  DEFUSE_SECONDS,
  DEFUSE_WITH_KIT_SECONDS,
  damageFlashBySlot,
  deathProgressBySlot,
  GUNFIRE_SPUR_SECONDS,
  gunfireBySlot,
  PLANT_SECONDS,
} from '../helpers/player-state';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  DEFAULT_SAMPLE_HZ,
  FLAG_ALIVE,
  FLAG_DEFUSING,
  FLAG_PLANTING,
  type MatchEvents,
  type ParsedDemo,
  type TickTrack,
} from '../schema';
import {
  atFrame,
  newEvents,
  newTrack,
  withBlind,
  withDamage,
  withDefuse,
  withKill,
  withShot,
} from './helpers';

const TICK_RATE = 64;
const SLOTS = 10;
const VICTIM = asPlayerSlot(1);

function newDemo(
  events: MatchEvents,
  track: TickTrack = newTrack({ frameCount: 400 }),
): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: TICK_RATE, players: [], weapons: [] },
    track,
    events,
  };
}

/** The clock position, in frames, that stands `seconds` of match time into the demo. */
function atSecond(seconds: number): number {
  return seconds * DEFAULT_SAMPLE_HZ;
}

describe('damageFlashBySlot', () => {
  const demo = newDemo(withDamage(newEvents(), { tick: asTick(TICK_RATE * 2), victim: VICTIM }));
  const flashes = new Float32Array(SLOTS);

  it('is at its brightest on the tick of the hit', () => {
    damageFlashBySlot(demo, atSecond(2), flashes);

    expect(flashes[VICTIM]).toBeCloseTo(1, 2);
  });

  it('decays to nothing over the flash window and stays there', () => {
    damageFlashBySlot(demo, atSecond(2 + DAMAGE_FLASH_SECONDS / 2), flashes);
    expect(flashes[VICTIM]).toBeCloseTo(0.5, 1);

    damageFlashBySlot(demo, atSecond(2 + DAMAGE_FLASH_SECONDS * 2), flashes);
    expect(flashes[VICTIM]).toBe(0);
  });

  it('leaves a slot the hit did not touch alone, and does not flash before the hit', () => {
    damageFlashBySlot(demo, atSecond(2), flashes);
    expect(flashes[0]).toBe(0);

    damageFlashBySlot(demo, atSecond(1), flashes);
    expect(flashes[VICTIM]).toBe(0);
  });

  it('takes the brighter of two hits landing inside one window', () => {
    const both = newDemo(
      withDamage(withDamage(newEvents(), { tick: asTick(TICK_RATE * 2), victim: VICTIM }), {
        tick: asTick(TICK_RATE * 2 + TICK_RATE / 8),
        victim: VICTIM,
      }),
    );

    damageFlashBySlot(both, atSecond(2 + 0.125), flashes);

    expect(flashes[VICTIM]).toBeCloseTo(1, 2);
  });
});

describe('gunfireBySlot', () => {
  const SHOOTER = asPlayerSlot(3);
  const demo = newDemo(withShot(newEvents(), { tick: asTick(TICK_RATE * 2), shooter: SHOOTER }));
  const spurs = new Float32Array(SLOTS);

  it('is at its brightest on the tick of the shot', () => {
    gunfireBySlot(demo, atSecond(2), spurs);

    expect(spurs[SHOOTER]).toBeCloseTo(1, 2);
  });

  it('decays to nothing over the spur window and stays there', () => {
    gunfireBySlot(demo, atSecond(2 + GUNFIRE_SPUR_SECONDS / 2), spurs);
    expect(spurs[SHOOTER]).toBeCloseTo(0.5, 1);

    gunfireBySlot(demo, atSecond(2 + GUNFIRE_SPUR_SECONDS * 2), spurs);
    expect(spurs[SHOOTER]).toBe(0);
  });

  it('leaves every other slot alone, and shows nothing before the trigger was pulled', () => {
    gunfireBySlot(demo, atSecond(2), spurs);
    expect(spurs[0]).toBe(0);

    gunfireBySlot(demo, atSecond(1), spurs);
    expect(spurs[SHOOTER]).toBe(0);
  });

  it('takes the brightest of a burst landing inside one window', () => {
    const burst = newDemo(
      withShot(withShot(newEvents(), { tick: asTick(TICK_RATE * 2), shooter: SHOOTER }), {
        tick: asTick(TICK_RATE * 2 + TICK_RATE / 16),
        shooter: SHOOTER,
      }),
    );

    gunfireBySlot(burst, atSecond(2 + 1 / 16), spurs);

    expect(spurs[SHOOTER]).toBeCloseTo(1, 2);
  });

  it('reads the same value going backwards as going forwards', () => {
    const forwards = new Float32Array(SLOTS);
    gunfireBySlot(demo, atSecond(2 + GUNFIRE_SPUR_SECONDS / 2), forwards);

    gunfireBySlot(demo, atSecond(5), spurs);
    gunfireBySlot(demo, atSecond(2 + GUNFIRE_SPUR_SECONDS / 2), spurs);

    expect(spurs[SHOOTER]).toBe(forwards[SHOOTER]);
  });
});

describe('blindRemainingBySlot', () => {
  const demo = newDemo(
    withBlind(newEvents(), { tick: asTick(TICK_RATE * 2), victim: VICTIM, durationSeconds: 3 }),
  );
  const remaining = new Float32Array(SLOTS);

  it('counts down over the duration the event carries', () => {
    blindRemainingBySlot(demo, atSecond(2), remaining);
    expect(remaining[VICTIM]).toBeCloseTo(1, 2);

    blindRemainingBySlot(demo, atSecond(3.5), remaining);
    expect(remaining[VICTIM]).toBeCloseTo(0.5, 2);

    blindRemainingBySlot(demo, atSecond(4.9), remaining);
    expect(remaining[VICTIM]).toBeGreaterThan(0);
  });

  it('clears once the duration is spent, and is not set before the flash', () => {
    blindRemainingBySlot(demo, atSecond(5.1), remaining);
    expect(remaining[VICTIM]).toBe(0);

    blindRemainingBySlot(demo, atSecond(1.9), remaining);
    expect(remaining[VICTIM]).toBe(0);
  });

  it('takes the longer of two flashes overlapping on one player', () => {
    const both = newDemo(
      withBlind(
        withBlind(newEvents(), {
          tick: asTick(TICK_RATE * 2),
          victim: VICTIM,
          durationSeconds: 3,
        }),
        { tick: asTick(TICK_RATE * 3), victim: VICTIM, durationSeconds: 3 },
      ),
    );

    blindRemainingBySlot(both, atSecond(3), remaining);

    expect(remaining[VICTIM]).toBeCloseTo(1, 2);
  });
});

describe('deathProgressBySlot', () => {
  const demo = newDemo(withKill(newEvents(), { tick: asTick(TICK_RATE * 2), victim: VICTIM }));
  const progress = new Float32Array(SLOTS);

  it('runs from the kill to a settled body over the shrink window', () => {
    deathProgressBySlot(demo, atSecond(2), progress);
    expect(progress[VICTIM]).toBeCloseTo(0, 2);

    deathProgressBySlot(demo, atSecond(2 + DEATH_SHRINK_SECONDS / 2), progress);
    expect(progress[VICTIM]).toBeCloseTo(0.5, 1);

    deathProgressBySlot(demo, atSecond(2 + DEATH_SHRINK_SECONDS * 2), progress);
    expect(progress[VICTIM]).toBe(1);
  });

  it('reads settled for a slot with no kill inside the window', () => {
    deathProgressBySlot(demo, atSecond(2), progress);

    expect(progress[0]).toBe(1);
    expect(progress[SLOTS - 1]).toBe(1);
  });

  it('starts again when the clock is scrubbed back to the kill', () => {
    deathProgressBySlot(demo, atSecond(2 + DEATH_SHRINK_SECONDS * 2), progress);
    expect(progress[VICTIM]).toBe(1);

    deathProgressBySlot(demo, atSecond(2 + DEATH_SHRINK_SECONDS / 2), progress);
    expect(progress[VICTIM]).toBeCloseTo(0.5, 1);
  });
});

describe('bombProgressAt', () => {
  function planting(flag: number, frames: number): TickTrack {
    const track = newTrack({ frameCount: 400 });

    for (let frame = 0; frame < frames; frame++) {
      atFrame(track, asFrame(frame), asPlayerSlot(0), { flags: FLAG_ALIVE | flag });
    }

    return track;
  }

  it('answers null for a player doing neither', () => {
    const demo = newDemo(newEvents());

    expect(bombProgressAt(demo, atSecond(1), asPlayerSlot(0))).toBeNull();
  });

  it('fills from the first sample the flag held', () => {
    const frames = Math.round(PLANT_SECONDS * DEFAULT_SAMPLE_HZ);
    const demo = newDemo(newEvents(), planting(FLAG_PLANTING, frames));

    expect(bombProgressAt(demo, 0, asPlayerSlot(0))).toBeCloseTo(0, 2);
    expect(bombProgressAt(demo, frames / 2, asPlayerSlot(0))).toBeCloseTo(0.5, 1);
  });

  it('never runs past a full arc', () => {
    const demo = newDemo(newEvents(), planting(FLAG_PLANTING, 300));

    expect(bombProgressAt(demo, 299, asPlayerSlot(0))).toBe(1);
  });

  it('fills twice as fast with a kit', () => {
    const track = planting(FLAG_DEFUSING, 300);
    const halfway = Math.round((DEFUSE_WITH_KIT_SECONDS / 2) * DEFAULT_SAMPLE_HZ);

    const without = newDemo(withDefuse(newEvents(), { hasKit: false }), track);
    const withIt = newDemo(withDefuse(newEvents(), { hasKit: true }), track);

    expect(bombProgressAt(without, halfway, asPlayerSlot(0))).toBeCloseTo(
      DEFUSE_WITH_KIT_SECONDS / 2 / DEFUSE_SECONDS,
      2,
    );
    expect(bombProgressAt(withIt, halfway, asPlayerSlot(0))).toBeCloseTo(0.5, 2);
  });
});
