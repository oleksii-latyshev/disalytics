import { describe, expect, it } from 'vitest';
import {
  blindedBySlot,
  bombProgressAt,
  DAMAGE_FLASH_SECONDS,
  DEFUSE_SECONDS,
  DEFUSE_WITH_KIT_SECONDS,
  damageFlashBySlot,
  lastIndexAtOrBefore,
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
import { atFrame, newEvents, newTrack, withBlind, withDamage, withDefuse } from './helpers';

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

describe('lastIndexAtOrBefore', () => {
  const events = [{ tick: asTick(10) }, { tick: asTick(20) }, { tick: asTick(30) }];

  it('finds the last event at or before the tick', () => {
    expect(lastIndexAtOrBefore(events, asTick(25))).toBe(1);
    expect(lastIndexAtOrBefore(events, asTick(30))).toBe(2);
    expect(lastIndexAtOrBefore(events, asTick(1000))).toBe(2);
  });

  it('answers -1 when every event is still ahead', () => {
    expect(lastIndexAtOrBefore(events, asTick(9))).toBe(-1);
    expect(lastIndexAtOrBefore([], asTick(9))).toBe(-1);
  });
});

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

describe('blindedBySlot', () => {
  const demo = newDemo(
    withBlind(newEvents(), { tick: asTick(TICK_RATE * 2), victim: VICTIM, durationSeconds: 3 }),
  );
  const blinded = new Uint8Array(SLOTS);

  it('holds for the duration the event carries', () => {
    blindedBySlot(demo, atSecond(2.5), blinded);
    expect(blinded[VICTIM]).toBe(1);

    blindedBySlot(demo, atSecond(4.9), blinded);
    expect(blinded[VICTIM]).toBe(1);
  });

  it('clears once the duration is spent, and is not set before the flash', () => {
    blindedBySlot(demo, atSecond(5.1), blinded);
    expect(blinded[VICTIM]).toBe(0);

    blindedBySlot(demo, atSecond(1.9), blinded);
    expect(blinded[VICTIM]).toBe(0);
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
