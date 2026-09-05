import {
  asPlayerSlot,
  asTick,
  type BombDefuse,
  type BombPlant,
  type DefuseOutcome,
  type Grenade,
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
    roundTimeSeconds: 115,
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
  return { tick: asTick(tick), planter: asPlayerSlot(1), siteEntityId: 0, detonationTick: null };
}

function newDefuse(startTick: number, outcome: DefuseOutcome): BombDefuse {
  return { startTick: asTick(startTick), defuser: asPlayerSlot(0), hasKit: true, outcome };
}

/** A smoke, which is the type whose whole life is bounded by an expiry the demo recorded. */
function newSmoke(throwTick: number, detonationTick: number, expiryTick: number): Grenade {
  return {
    thrower: asPlayerSlot(1),
    type: 'smokegrenade',
    throwTick: asTick(throwTick),
    detonationTick: asTick(detonationTick),
    detonationPosition: { x: 0, y: 0, z: 0 },
    expiryTick: asTick(expiryTick),
    trajectory: {
      firstTick: asTick(throwTick),
      sampleHz: SAMPLE_HZ,
      sampleCount: 0,
      x: new Float32Array(0),
      y: new Float32Array(0),
      z: new Float32Array(0),
    },
  };
}

interface Options {
  kills?: readonly Kill[];
  plants?: readonly BombPlant[];
  defuses?: readonly BombDefuse[];
  grenades?: readonly Grenade[];
}

function newDemo(options: Options = {}): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: TICK_RATE, players: [], weapons: [] },
    track: newTrack(4001),
    events: {
      rounds: [newRound(1, 0), newRound(2, 8000)],
      kills: options.kills ?? [],
      damage: [],
      shots: [],
      grenades: options.grenades ?? [],
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

describe("a row's focus", () => {
  it('carries both ends, both sides and the frame the kill happened on', () => {
    const row = roundFeed(newDemo({ kills: [newKill(2000)] }), 0).at(0);

    expect(row?.focus).toEqual({
      kind: 'kill',
      line: {
        frame: 500,
        attacker: 0,
        victim: 1,
        attackerSide: 'CT',
        victimSide: 'T',
      },
    });
  });

  it('draws no line for a world kill, which has no second end', () => {
    const kill = newKill(2000, { attacker: null, weapon: 'world' });
    const row = roundFeed(newDemo({ kills: [kill] }), 0).at(0);

    expect(row?.focus).toBeNull();
  });

  it('draws no line for an objective row', () => {
    const row = roundFeed(newDemo({ plants: [newPlant(3000)] }), 0).at(0);

    expect(row?.focus).toBeNull();
  });

  it('points a grenade row at the grenade itself', () => {
    const row = roundFeed(newDemo({ grenades: [newSmoke(2000, 2100, 3000)] }), 0).at(0);

    expect(row?.focus).toEqual({ kind: 'grenade', index: 0 });
  });
});

describe('a grenade row', () => {
  const demo = newDemo({ grenades: [newSmoke(2000, 2100, 3000)] });
  const rows = roundFeed(demo, 0);

  it('stands at the throw rather than at the detonation', () => {
    expect(rows.at(0)?.frame).toBe(500);
  });

  it('names the thrower and the side that slot held that round', () => {
    const event = rows.at(0)?.event;

    expect(event?.kind === 'grenade' && event.thrower).toBe(1);
    expect(event?.kind === 'grenade' && event.throwerSide).toBe('T');
    expect(event?.kind === 'grenade' && event.utility).toBe('smoke');
  });

  it('leaves the feed when the grenade does, which no other row kind does', () => {
    expect(visibleFeed(rows, 500).map((row) => row.id)).toEqual(['nade-0']);
    expect(visibleFeed(rows, 750).map((row) => row.id)).toEqual(['nade-0']);
    expect(visibleFeed(rows, 751)).toEqual([]);
  });

  it('does not push a kill that is still live out of the eight', () => {
    const kills = Array.from({ length: 8 }, (_, index) => newKill(400 + index * 100));
    const withUtility = newDemo({ kills, grenades: [newSmoke(2000, 2100, 2200)] });
    const feed = roundFeed(withUtility, 0);

    // The smoke is thrown after every kill and is gone by frame 551, so the eight rows the feed
    // holds are the eight kills again rather than seven and a cloud that stopped existing.
    expect(visibleFeed(feed, 600).map((row) => row.id)).toEqual([
      'kill-7',
      'kill-6',
      'kill-5',
      'kill-4',
      'kill-3',
      'kill-2',
      'kill-1',
      'kill-0',
    ]);
  });
});
