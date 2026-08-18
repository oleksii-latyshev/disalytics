import {
  asPlayerSlot,
  asTick,
  type BombDefuse,
  type BombPlant,
  type DefuseOutcome,
  type Kill,
  type ParsedDemo,
  type Round,
  type TickTrack,
  WEAPON_NONE,
} from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { FEED_ROW_LIMIT, roundFeed, visibleFeed } from '../helpers/event-feed';

// 64 ticks to 16 samples, so a frame is a tick over four. The fixture is local rather than shared
// with `features/timeline`'s: a test reaching sideways into another feature is the import direction
// hard rule 13 rules out, and the feed needs only a fraction of what that one builds.
const TICK_RATE = 64;
const SAMPLE_HZ = 16;

function newTrack(frameCount: number): TickTrack {
  return {
    tickRate: TICK_RATE,
    sampleHz: SAMPLE_HZ,
    frameCount,
    slotCount: 2,
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

/** Slot 0 opens on CT and slot 1 on T, which is what tints the two names on a kill row. */
function newRound(number: number, startTick: number): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 640),
    endTick: asTick(startTick + 6400),
    winner: 'CT',
    reason: 'all-t-eliminated',
    economy: [
      { slot: asPlayerSlot(0), money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'CT' },
      { slot: asPlayerSlot(1), money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'T' },
    ],
  };
}

function newKill(tick: number, overrides: Partial<Kill> = {}): Kill {
  return {
    tick: asTick(tick),
    attacker: asPlayerSlot(0),
    victim: asPlayerSlot(1),
    assister: null,
    weapon: 'ak47',
    isHeadshot: false,
    isWallbang: false,
    isThroughSmoke: false,
    isNoScope: false,
    isAttackerBlind: false,
    isVictimBlind: false,
    distanceUnits: 0,
    ...overrides,
  };
}

function newPlant(tick: number): BombPlant {
  return { tick: asTick(tick), planter: asPlayerSlot(1), siteEntityId: 0 };
}

function newDefuse(startTick: number, outcome: DefuseOutcome): BombDefuse {
  return { startTick: asTick(startTick), defuser: asPlayerSlot(0), hasKit: true, outcome };
}

interface Options {
  kills?: readonly Kill[];
  plants?: readonly BombPlant[];
  defuses?: readonly BombDefuse[];
}

function newDemo(options: Options = {}): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: TICK_RATE, players: [], weapons: [] },
    track: newTrack(4001),
    events: {
      rounds: [newRound(1, 0), newRound(2, 8000)],
      kills: options.kills ?? [],
      damage: [],
      grenades: [],
      blinds: [],
      plants: options.plants ?? [],
      defuses: options.defuses ?? [],
    },
  };
}

describe('roundFeed', () => {
  it('derives the round events in the order they happened', () => {
    const demo = newDemo({
      kills: [newKill(2000), newKill(400)],
      plants: [newPlant(3000)],
    });

    expect(roundFeed(demo, 0).map((row) => row.id)).toEqual(['kill-1', 'kill-0', 'plant-0']);
  });

  it('puts each row at the frame its event happened on', () => {
    const rows = roundFeed(newDemo({ kills: [newKill(2000)] }), 0);

    expect(rows.at(0)?.frame).toBe(500);
  });

  it('clips to the round rather than to the segment, so a post-round kill never arrives', () => {
    // `newRound` closes round one at tick 6400 and opens round two at 8000. A kill in that gap is
    // the post-round kill §7.3 refuses to count.
    const demo = newDemo({ kills: [newKill(6000), newKill(7000)] });

    expect(roundFeed(demo, 0).map((row) => row.id)).toEqual(['kill-0']);
  });

  it('reads the side each slot held that round, which is what colours the two names', () => {
    const rows = roundFeed(newDemo({ kills: [newKill(2000)] }), 0);
    const event = rows.at(0)?.event;

    expect(event?.kind === 'kill' && event.attackerSide).toBe('CT');
    expect(event?.kind === 'kill' && event.victimSide).toBe('T');
  });

  it('classifies the weapon through the kill vocabulary rather than the display one', () => {
    const rows = roundFeed(newDemo({ kills: [newKill(2000, { weapon: 'awp' })] }), 0);
    const event = rows.at(0)?.event;

    expect(event?.kind === 'kill' && event.weapon).toBe('sniper');
  });

  it('leaves a world kill without an attacker or a side', () => {
    const rows = roundFeed(
      newDemo({ kills: [newKill(2000, { attacker: null, weapon: 'world' })] }),
      0,
    );
    const event = rows.at(0)?.event;

    expect(event?.kind === 'kill' && event.attacker).toBeNull();
    expect(event?.kind === 'kill' && event.attackerSide).toBeUndefined();
    expect(event?.kind === 'kill' && event.weapon).toBe('unknown');
  });

  it('carries the three marks a kill row draws', () => {
    const kill = newKill(2000, { isHeadshot: true, isWallbang: true, isThroughSmoke: true });
    const event = roundFeed(newDemo({ kills: [kill] }), 0).at(0)?.event;

    expect(event?.kind === 'kill' && event.isHeadshot).toBe(true);
    expect(event?.kind === 'kill' && event.isWallbang).toBe(true);
    expect(event?.kind === 'kill' && event.isThroughSmoke).toBe(true);
  });

  it('marks a completed defuse where it finished', () => {
    const demo = newDemo({
      defuses: [newDefuse(3000, { status: 'completed', tick: asTick(4000) })],
    });
    const rows = roundFeed(demo, 0);

    expect(rows.map((row) => row.id)).toEqual(['defuse-0']);
    expect(rows.at(0)?.frame).toBe(1000);
  });

  it('leaves out a defuse that never completed, which is not something that happened', () => {
    const demo = newDemo({
      defuses: [
        newDefuse(3000, { status: 'aborted', tick: asTick(3200) }),
        newDefuse(4000, { status: 'interrupted' }),
      ],
    });

    expect(roundFeed(demo, 0)).toEqual([]);
  });

  it('has nothing to show during the warm-up, which no round covers', () => {
    expect(roundFeed(newDemo({ kills: [newKill(2000)] }), undefined)).toEqual([]);
  });

  it('has nothing to show for a round index the match does not hold', () => {
    expect(roundFeed(newDemo({ kills: [newKill(2000)] }), 9)).toEqual([]);
  });
});

describe('visibleFeed', () => {
  const rows = roundFeed(
    newDemo({ kills: Array.from({ length: 12 }, (_, index) => newKill(400 + index * 400)) }),
    0,
  );

  it('shows the newest event first', () => {
    expect(visibleFeed(rows, 300).map((row) => row.id)).toEqual(['kill-2', 'kill-1', 'kill-0']);
  });

  it('shows nothing before the first event of the round', () => {
    expect(visibleFeed(rows, 0)).toEqual([]);
  });

  it('holds at the row limit however long the round runs', () => {
    expect(visibleFeed(rows, 5000)).toHaveLength(FEED_ROW_LIMIT);
  });

  it('is a function of the playhead, so scrubbing backwards takes rows away', () => {
    expect(visibleFeed(rows, 5000)).toHaveLength(FEED_ROW_LIMIT);
    expect(visibleFeed(rows, 200)).toHaveLength(2);
    expect(visibleFeed(rows, 0)).toEqual([]);
  });

  it('includes an event standing exactly on the playhead', () => {
    expect(visibleFeed(rows, 100).map((row) => row.id)).toEqual(['kill-0']);
  });
});
