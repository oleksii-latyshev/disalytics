import { describe, expect, it } from 'vitest';
import {
  bombTimerTicks,
  DEFAULT_BOMB_TIMER_SECONDS,
  roundClockAtFrame,
} from '../helpers/round-clock';
import { asPlayerSlot, asTick, type MatchEvents, type ParsedDemo, type Round } from '../schema';
import { newEvents, newTrack } from './helpers';

const header = { map: 'de_dust2', tickRate: 64, players: [], weapons: [] };

function newRound(overrides: Partial<Round> = {}): Round {
  return {
    number: 1,
    startTick: asTick(0),
    freezeTimeEndTick: asTick(0),
    endTick: asTick(0),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: [],
    ...overrides,
  };
}

describe('bombTimerTicks', () => {
  const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 2000 });

  function newDemo(plants: MatchEvents['plants']): ParsedDemo {
    return { header, track, events: { ...newEvents(), plants } };
  }

  it('measures the match its own timer from the first bomb that went off', () => {
    const demo = newDemo([
      { tick: asTick(1000), planter: asPlayerSlot(0), siteEntityId: 301, detonationTick: null },
      {
        tick: asTick(5000),
        planter: asPlayerSlot(1),
        siteEntityId: 309,
        detonationTick: asTick(5000 + 41 * 64),
      },
    ]);

    expect(bombTimerTicks(demo)).toBe(41 * 64);
  });

  it('falls back to the engine default where no bomb in the match ever exploded', () => {
    const demo = newDemo([
      { tick: asTick(1000), planter: asPlayerSlot(0), siteEntityId: 301, detonationTick: null },
    ]);

    expect(bombTimerTicks(demo)).toBe(DEFAULT_BOMB_TIMER_SECONDS * 64);
    expect(bombTimerTicks(newDemo([]))).toBe(DEFAULT_BOMB_TIMER_SECONDS * 64);
  });
});

describe('roundClockAtFrame', () => {
  const track = newTrack({ tickRate: 64, sampleHz: 16, frameCount: 2000 });

  function newDemo(rounds: readonly Round[], plants: MatchEvents['plants'] = []): ParsedDemo {
    return { header, track, events: { ...newEvents(), rounds, plants } };
  }

  // A 50-second round: freeze from tick 640 to 1280, live to 4480. Frame f is tick 4f.
  const bounds = {
    startTick: asTick(640),
    freezeTimeEndTick: asTick(1280),
    endTick: asTick(4480),
  };

  const round = newRound(bounds);
  const timed = newRound({ ...bounds, roundTimeSeconds: 115 });

  const demo = newDemo([round]);
  const timedDemo = newDemo([timed]);

  it('counts the buy phase down to zero', () => {
    // frame 200 is tick 800 at 64/16 — 480 ticks, seven and a half seconds, short of the freeze end.
    expect(roundClockAtFrame(demo, 200)).toEqual({ phase: 'freeze', seconds: 8 });
  });

  it('opens the buy phase on its full length rather than one second below it', () => {
    expect(roundClockAtFrame(demo, 160)).toEqual({ phase: 'freeze', seconds: 10 });
  });

  it('counts the round down from the length the demo states', () => {
    // frame 400 is tick 1600, five seconds past the freeze end, so 110 of 115 are left.
    expect(roundClockAtFrame(timedDemo, 400)).toEqual({ phase: 'live', seconds: 110 });
  });

  it('opens the round on its full length rather than one second below it', () => {
    expect(roundClockAtFrame(timedDemo, 320)).toEqual({ phase: 'live', seconds: 115 });
  });

  it('counts up instead where the demo carries no round length', () => {
    expect(roundClockAtFrame(demo, 400)).toEqual({ phase: 'live', seconds: 5 });
  });

  it('holds the ending time through the post-round rather than counting on', () => {
    // The round ran 3200 ticks, fifty seconds, so 65 of the 115 are left when it ends.
    expect(roundClockAtFrame(timedDemo, 1200)).toEqual({ phase: 'post', seconds: 65 });
    expect(roundClockAtFrame(demo, 1200)).toEqual({ phase: 'post', seconds: 50 });
  });

  describe('once the bomb is down', () => {
    const plantTick = 1920;
    const planted = newDemo(
      [timed],
      [
        {
          tick: asTick(plantTick),
          planter: asPlayerSlot(0),
          siteEntityId: 301,
          detonationTick: asTick(plantTick + 41 * 64),
        },
      ],
    );

    it('replaces the round clock with the bomb, as the game HUD does', () => {
      // frame 480 is the plant tick itself, where the whole timer is still ahead.
      expect(roundClockAtFrame(planted, 480)).toEqual({ phase: 'bomb', seconds: 41 });
      // frame 640 is tick 2560, ten seconds after the plant.
      expect(roundClockAtFrame(planted, 640)).toEqual({ phase: 'bomb', seconds: 31 });
    });

    it('reads the round before the plant and never after the previous round', () => {
      expect(roundClockAtFrame(planted, 400)).toEqual({ phase: 'live', seconds: 110 });
      expect(roundClockAtFrame(planted, 200)).toEqual({ phase: 'freeze', seconds: 8 });
    });

    it('holds the bomb time the round ended on', () => {
      // The round ends at tick 4480, 2560 ticks — forty seconds — after the plant.
      expect(roundClockAtFrame(planted, 1200)).toEqual({ phase: 'post', seconds: 1 });
    });

    it("measures the match's own timer for a bomb that never went off", () => {
      const defused = newDemo(
        [timed],
        [
          {
            tick: asTick(plantTick),
            planter: asPlayerSlot(0),
            siteEntityId: 301,
            detonationTick: null,
          },
        ],
      );

      expect(roundClockAtFrame(defused, 480)).toEqual({
        phase: 'bomb',
        seconds: DEFAULT_BOMB_TIMER_SECONDS,
      });
    });

    it('never shows a negative second, whatever outlived what', () => {
      const late = newDemo(
        [timed],
        [
          {
            tick: asTick(plantTick),
            planter: asPlayerSlot(0),
            siteEntityId: 301,
            detonationTick: asTick(plantTick + 64),
          },
        ],
      );

      expect(roundClockAtFrame(late, 1200)).toEqual({ phase: 'post', seconds: 0 });
    });

    it("leaves a previous round's plant out of this round's reading", () => {
      const second = newRound({
        number: 2,
        startTick: asTick(4800),
        freezeTimeEndTick: asTick(5440),
        endTick: asTick(8000),
        roundTimeSeconds: 115,
      });
      const carried = newDemo(
        [timed, second],
        [
          {
            tick: asTick(plantTick),
            planter: asPlayerSlot(0),
            siteEntityId: 301,
            detonationTick: asTick(plantTick + 41 * 64),
          },
        ],
      );

      // frame 1440 is tick 5760, five seconds into the second round's live phase.
      expect(roundClockAtFrame(carried, 1440)).toEqual({ phase: 'live', seconds: 110 });
    });
  });

  it('has no answer during warmup, which no round covers', () => {
    expect(roundClockAtFrame(demo, 0)).toBeUndefined();
  });

  it('has no answer for a match with no rounds', () => {
    expect(roundClockAtFrame(newDemo([]), 400)).toBeUndefined();
  });
});
