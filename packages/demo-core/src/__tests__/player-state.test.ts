import { describe, expect, it } from 'vitest';
import {
  blindRemainingBySlot,
  bombProgressAt,
  DAMAGE_FLASH_SECONDS,
  DAMAGE_TALLY_FADE_SECONDS,
  DAMAGE_TALLY_WINDOW_SECONDS,
  DEATH_SHRINK_SECONDS,
  DEFUSE_SECONDS,
  DEFUSE_WITH_KIT_SECONDS,
  damageFlashBySlot,
  damageTallyBySlot,
  deathProgressBySlot,
  GUNFIRE_TRACER_SECONDS,
  PLANT_SECONDS,
  playerButtonsAt,
  playerMovementAccuracy,
  playerPitchAt,
  playerSpeedAt,
  visibleShots,
} from '../helpers/player-state';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  DEFAULT_SAMPLE_HZ,
  FLAG_ALIVE,
  FLAG_DEFUSING,
  FLAG_DUCKING,
  FLAG_PLANTING,
  FLAG_SCOPED,
  FLAG_WALKING,
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

describe('damageTallyBySlot', () => {
  const OTHER = asPlayerSlot(4);
  const totals = new Float32Array(SLOTS);
  const life = new Float32Array(SLOTS);

  /** A spray: hits at `seconds`, each carrying `healthDamage`, all on `VICTIM`. */
  function withSpray(seconds: readonly number[], healthDamage: number): ParsedDemo {
    let events = newEvents();
    for (const second of seconds) {
      events = withDamage(events, {
        tick: asTick(Math.round(TICK_RATE * second)),
        victim: VICTIM,
        healthDamage,
      });
    }

    return newDemo(events);
  }

  it('adds up the hits of one spray into a single climbing figure', () => {
    const demo = withSpray([2, 2.1, 2.2, 2.3], 11);

    damageTallyBySlot(demo, atSecond(2.1), totals, life);
    expect(totals[VICTIM]).toBe(22);

    damageTallyBySlot(demo, atSecond(2.3), totals, life);
    expect(totals[VICTIM]).toBe(44);
  });

  it('starts the figure again when a hit lands further out than the window', () => {
    const demo = withSpray([2, 2 + DAMAGE_TALLY_WINDOW_SECONDS + 0.1], 30);

    damageTallyBySlot(demo, atSecond(2 + DAMAGE_TALLY_WINDOW_SECONDS + 0.1), totals, life);

    expect(totals[VICTIM]).toBe(30);
  });

  it('holds at full strength for the window and then fades to nothing', () => {
    const demo = withSpray([2], 42);

    damageTallyBySlot(demo, atSecond(2 + DAMAGE_TALLY_WINDOW_SECONDS - 0.1), totals, life);
    expect(life[VICTIM]).toBe(1);
    expect(totals[VICTIM]).toBe(42);

    damageTallyBySlot(
      demo,
      atSecond(2 + DAMAGE_TALLY_WINDOW_SECONDS + DAMAGE_TALLY_FADE_SECONDS / 2),
      totals,
      life,
    );
    expect(life[VICTIM]).toBeCloseTo(0.5, 1);

    damageTallyBySlot(
      demo,
      atSecond(2 + DAMAGE_TALLY_WINDOW_SECONDS + DAMAGE_TALLY_FADE_SECONDS + 0.1),
      totals,
      life,
    );
    expect(life[VICTIM]).toBe(0);
    expect(totals[VICTIM]).toBe(0);
  });

  it('runs the fade from the newest hit of a chain rather than its first', () => {
    const demo = withSpray([2, 3, 4], 20);

    damageTallyBySlot(demo, atSecond(4 + DAMAGE_TALLY_WINDOW_SECONDS - 0.1), totals, life);

    expect(life[VICTIM]).toBe(1);
    expect(totals[VICTIM]).toBe(60);
  });

  it('says nothing before the hit, and nothing about a slot it did not touch', () => {
    const demo = withSpray([2], 42);

    damageTallyBySlot(demo, atSecond(2), totals, life);
    expect(totals[OTHER]).toBe(0);
    expect(life[OTHER]).toBe(0);

    damageTallyBySlot(demo, atSecond(1.5), totals, life);
    expect(totals[VICTIM]).toBe(0);
    expect(life[VICTIM]).toBe(0);
  });

  it('keeps two victims of the same exchange apart', () => {
    const demo = newDemo(
      withDamage(
        withDamage(newEvents(), { tick: asTick(TICK_RATE * 2), victim: VICTIM, healthDamage: 30 }),
        {
          tick: asTick(TICK_RATE * 2 + 8),
          victim: OTHER,
          healthDamage: 70,
        },
      ),
    );

    damageTallyBySlot(demo, atSecond(2.2), totals, life);

    expect(totals[VICTIM]).toBe(30);
    expect(totals[OTHER]).toBe(70);
  });

  it('counts a hit from a teammate as damage the victim took', () => {
    const demo = newDemo(
      withDamage(newEvents(), {
        tick: asTick(TICK_RATE * 2),
        attacker: VICTIM,
        victim: OTHER,
        healthDamage: 35,
      }),
    );

    damageTallyBySlot(demo, atSecond(2), totals, life);

    expect(totals[OTHER]).toBe(35);
    expect(totals[VICTIM]).toBe(0);
  });
});

describe('visibleShots', () => {
  const SHOOTER = asPlayerSlot(3);
  const AIM = 4_500;
  const demo = newDemo(
    withShot(newEvents(), { tick: asTick(TICK_RATE * 2), shooter: SHOOTER, yaw: AIM }),
  );
  const indices = new Int32Array(8);
  const life = new Float32Array(8);

  it('is at its brightest on the tick of the shot, and names the shot that made it', () => {
    const count = visibleShots(demo, atSecond(2), indices, life);

    expect(count).toBe(1);
    expect(life[0]).toBeCloseTo(1, 2);
    expect(demo.events.shots[indices[0] ?? -1]?.yaw).toBe(AIM);
  });

  it('decays to nothing over the window and stays there', () => {
    expect(visibleShots(demo, atSecond(2 + GUNFIRE_TRACER_SECONDS / 2), indices, life)).toBe(1);
    expect(life[0]).toBeCloseTo(0.5, 1);

    expect(visibleShots(demo, atSecond(2 + GUNFIRE_TRACER_SECONDS * 2), indices, life)).toBe(0);
  });

  it('shows nothing before the trigger was pulled', () => {
    expect(visibleShots(demo, atSecond(1), indices, life)).toBe(0);
  });

  it('keeps every shot of a burst rather than the brightest of them', () => {
    const burst = newDemo(
      withShot(withShot(newEvents(), { tick: asTick(TICK_RATE * 2), shooter: SHOOTER, yaw: AIM }), {
        tick: asTick(TICK_RATE * 2 + TICK_RATE / 16),
        shooter: SHOOTER,
        yaw: -AIM,
      }),
    );

    const count = visibleShots(burst, atSecond(2 + 1 / 16), indices, life);

    // Both, and the newer one first: a burst whose aim walked is two rays and not one.
    expect(count).toBe(2);
    expect(demo.events.shots.length).toBe(1);
    expect(burst.events.shots[indices[0] ?? -1]?.yaw).toBe(-AIM);
    expect(burst.events.shots[indices[1] ?? -1]?.yaw).toBe(AIM);
    expect(life[0]).toBeCloseTo(1, 2);
    expect(life[1]).toBeLessThan(life[0] ?? 0);
  });

  it('writes no more than the caller made room for', () => {
    let events = newEvents();
    for (let index = 0; index < 6; index++) {
      // Inside the window and all already fired: the cap is what is being tested, not the walk.
      events = withShot(events, {
        tick: asTick(TICK_RATE * 2 - index),
        shooter: SHOOTER,
        yaw: AIM,
      });
    }

    const small = new Int32Array(2);
    const smallLife = new Float32Array(2);

    expect(visibleShots(newDemo(events), atSecond(2), small, smallLife)).toBe(2);
  });

  it('reads the same value going backwards as going forwards', () => {
    const forwards = new Float32Array(8);
    visibleShots(demo, atSecond(2 + GUNFIRE_TRACER_SECONDS / 2), indices, forwards);

    visibleShots(demo, atSecond(5), indices, life);
    visibleShots(demo, atSecond(2 + GUNFIRE_TRACER_SECONDS / 2), indices, life);

    expect(life[0]).toBe(forwards[0]);
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

describe('playerSpeedAt', () => {
  it('reads player speed from track', () => {
    const track = newTrack({ frameCount: 10 });
    const slot = asPlayerSlot(2);
    track.speed[5 * track.slotCount + slot] = 250;

    expect(playerSpeedAt(track, 5, slot)).toBe(250);
    expect(playerSpeedAt(track, 0, slot)).toBe(0);
  });
});

describe('playerButtonsAt', () => {
  it('returns all false for dead player', () => {
    const track = newTrack({ frameCount: 10 });
    const slot = asPlayerSlot(0);
    track.flags[slot] = 0; // Not alive

    const demo = newDemo(newEvents(), track);
    const buttons = playerButtonsAt(demo, 0, slot);

    expect(buttons.forward).toBe(false);
    expect(buttons.jump).toBe(false);
    expect(buttons.duck).toBe(false);
    expect(buttons.attack).toBe(false);
  });

  it('reads ducking and walking from flags', () => {
    const track = newTrack({ frameCount: 10 });
    const slot = asPlayerSlot(1);
    track.flags[slot] = FLAG_ALIVE | FLAG_DUCKING | FLAG_WALKING;

    const demo = newDemo(newEvents(), track);
    const buttons = playerButtonsAt(demo, 0, slot);

    expect(buttons.duck).toBe(true);
    expect(buttons.walk).toBe(true);
    expect(buttons.attack2).toBe(false);
  });

  it('detects attack2 from scoped flag', () => {
    const track = newTrack({ frameCount: 10 });
    const slot = asPlayerSlot(1);
    track.flags[slot] = FLAG_ALIVE | FLAG_SCOPED;

    const demo = newDemo(newEvents(), track);
    const buttons = playerButtonsAt(demo, 0, slot);

    expect(buttons.attack2).toBe(true);
  });

  it('detects attack from shot event', () => {
    const track = newTrack({ frameCount: 50 });
    const slot = asPlayerSlot(3);
    track.flags[10 * track.slotCount + slot] = FLAG_ALIVE;

    const events = withShot(newEvents(), {
      tick: asTick(Math.round((10 / DEFAULT_SAMPLE_HZ) * TICK_RATE)),
      shooter: slot,
    });

    const demo = newDemo(events, track);
    const buttons = playerButtonsAt(demo, 10, slot);

    expect(buttons.attack).toBe(true);
  });

  it('detects jump from upward vertical movement', () => {
    const track = newTrack({ frameCount: 10 });
    const slot = asPlayerSlot(0);
    const prev = 1 * track.slotCount + slot;
    const curr = 2 * track.slotCount + slot;

    track.flags[curr] = FLAG_ALIVE;
    track.posZ[prev] = 100;
    track.posZ[curr] = 110; // +10 units upward

    const demo = newDemo(newEvents(), track);
    const buttons = playerButtonsAt(demo, 2, slot);

    expect(buttons.jump).toBe(true);
  });

  it('detects forward and lateral movement based on yaw', () => {
    const track = newTrack({ frameCount: 10 });
    const slot = asPlayerSlot(0);
    const prev = 1 * track.slotCount + slot;
    const curr = 2 * track.slotCount + slot;

    track.flags[curr] = FLAG_ALIVE;
    track.speed[curr] = 250;
    track.yaw[curr] = 0; // Facing East (+X)
    track.posX[prev] = 0;
    track.posX[curr] = 15; // Moving East (+X) -> forward (W)
    track.posY[prev] = 0;
    track.posY[curr] = 0;

    const demo = newDemo(newEvents(), track);
    const buttons = playerButtonsAt(demo, 2, slot);

    expect(buttons.forward).toBe(true);
    expect(buttons.back).toBe(false);
    expect(buttons.left).toBe(false);
    expect(buttons.right).toBe(false);
  });
});

describe('playerPitchAt', () => {
  it('returns 0 for empty track', () => {
    const track = newTrack({ frameCount: 0 });
    expect(playerPitchAt(track, 0, asPlayerSlot(0))).toBe(0);
  });

  it('decodes pitch in degrees from ANGLE_SCALE scaled value', () => {
    const track = newTrack({ frameCount: 5 });
    const slot = asPlayerSlot(2);
    const sample = 2 * track.slotCount + slot;

    track.pitch[sample] = 0;
    expect(playerPitchAt(track, 2, slot)).toBe(0);

    track.pitch[sample] = -4500; // Looking up 45 deg
    expect(playerPitchAt(track, 2, slot)).toBe(-45);

    track.pitch[sample] = 3050; // Looking down 30.5 deg
    expect(playerPitchAt(track, 2, slot)).toBe(30.5);
  });
});

describe('playerMovementAccuracy', () => {
  it('reports not accurate when player is dead', () => {
    const track = newTrack({ frameCount: 5 });
    const slot = asPlayerSlot(0);
    track.flags[slot] = 0; // Not alive

    const demo = newDemo(newEvents(), track);
    const acc = playerMovementAccuracy(demo, 0, slot);

    expect(acc.isAccurate).toBe(false);
    expect(acc.speed).toBe(0);
  });

  it('calculates accuracy for AK-47 when stopped or counter-strafing', () => {
    const track = newTrack({ frameCount: 5 });
    const slot = asPlayerSlot(1);
    track.flags[slot] = FLAG_ALIVE;
    track.weapon[slot] = 0; // weapon index 0
    track.speed[slot] = 50;

    const demo: ParsedDemo = {
      header: { map: 'de_dust2', tickRate: TICK_RATE, players: [], weapons: ['AK-47'] },
      track,
      events: newEvents(),
    };

    const acc = playerMovementAccuracy(demo, 0, slot);
    expect(acc.maxSpeed).toBe(215);
    expect(acc.accuracyThreshold).toBe(73); // Math.round(215 * 0.34)
    expect(acc.isAccurate).toBe(true);

    // When running full speed
    track.speed[slot] = 215;
    const runningAcc = playerMovementAccuracy(demo, 0, slot);
    expect(runningAcc.isAccurate).toBe(false);
    expect(runningAcc.ratio).toBe(1);
  });

  it('accounts for scoped speed limit on snipers', () => {
    const track = newTrack({ frameCount: 5 });
    const slot = asPlayerSlot(0);
    track.flags[slot] = FLAG_ALIVE | FLAG_SCOPED;
    track.weapon[slot] = 0; // AWP
    track.speed[slot] = 30;

    const demo: ParsedDemo = {
      header: { map: 'de_dust2', tickRate: TICK_RATE, players: [], weapons: ['AWP'] },
      track,
      events: newEvents(),
    };

    const scopedAcc = playerMovementAccuracy(demo, 0, slot);
    expect(scopedAcc.maxSpeed).toBe(100);
    expect(scopedAcc.accuracyThreshold).toBe(34);
    expect(scopedAcc.isAccurate).toBe(true);

    track.speed[slot] = 40;
    const inaccurateAcc = playerMovementAccuracy(demo, 0, slot);
    expect(inaccurateAcc.isAccurate).toBe(false);
  });
});
