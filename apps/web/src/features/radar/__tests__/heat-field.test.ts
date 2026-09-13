import {
  asPlayerSlot,
  asTick,
  FLAG_ALIVE,
  type ParsedDemo,
  type PlayerSlot,
  type Round,
  sampleAt,
  type Team,
  type TickTrack,
  WEAPON_NONE,
} from '@disa/demo-core';
import { MAP_OVERVIEWS, RADAR_IMAGE_SIZE } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { HEAT_GRID, heatField } from '../helpers/heat-field';

const dust2 = MAP_OVERVIEWS.de_dust2;

const TICK_RATE = 64;
const SAMPLE_HZ = 16;
const SLOT_COUNT = 2;
const FRAME_COUNT = 8;
/** Slot 1 is shot at the halfway frame and its body stays on the map for the rest of the round. */
const DEATH_FRAME = 4;

/** A world point that lands in the middle of the bin at `bin`, whatever the map's own transform. */
function worldAtBin(binX: number, binY: number): { x: number; y: number } {
  const pixels = (RADAR_IMAGE_SIZE / HEAT_GRID) * 0.5;

  return {
    x: dust2.posX + ((binX * RADAR_IMAGE_SIZE) / HEAT_GRID) * dust2.scale + pixels * dust2.scale,
    y: dust2.posY - ((binY * RADAR_IMAGE_SIZE) / HEAT_GRID) * dust2.scale - pixels * dust2.scale,
  };
}

const HELD = worldAtBin(40, 40);
const CROSSED = worldAtBin(80, 60);
const FELL = worldAtBin(20, 100);

function binAt(binX: number, binY: number): number {
  return binY * HEAT_GRID + binX;
}

function newTrack(): TickTrack {
  const length = FRAME_COUNT * SLOT_COUNT;
  const track: TickTrack = {
    tickRate: TICK_RATE,
    sampleHz: SAMPLE_HZ,
    frameCount: FRAME_COUNT,
    slotCount: SLOT_COUNT,
    posX: new Float32Array(length),
    posY: new Float32Array(length),
    posZ: new Float32Array(length),
    yaw: new Int16Array(length),
    pitch: new Int16Array(length),
    health: new Uint8Array(length),
    flags: new Uint8Array(length),
    speed: new Uint16Array(length),
    armour: new Uint8Array(length),
    weapon: new Uint8Array(length).fill(WEAPON_NONE),
    grenades: new Uint8Array(length),
    money: new Uint16Array(length),
  };

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const held = frame * SLOT_COUNT;
    const other = held + 1;
    const isAlive = frame < DEATH_FRAME;

    track.posX[held] = HELD.x;
    track.posY[held] = HELD.y;
    track.flags[held] = FLAG_ALIVE;

    track.posX[other] = isAlive ? CROSSED.x : FELL.x;
    track.posY[other] = isAlive ? CROSSED.y : FELL.y;
    track.flags[other] = isAlive ? FLAG_ALIVE : 0;
  }

  return track;
}

/** One round covering every frame the track holds, slot 0 on CT and slot 1 on T. */
function newRound(freezeFrames = 0): Round {
  return {
    number: 1,
    startTick: asTick(0),
    freezeTimeEndTick: asTick((freezeFrames / SAMPLE_HZ) * TICK_RATE),
    endTick: asTick(((FRAME_COUNT - 1) / SAMPLE_HZ) * TICK_RATE),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: 115,
    economy: [
      { slot: asPlayerSlot(0), money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'CT' },
      { slot: asPlayerSlot(1), money: 0, equipmentValue: 0, buyType: 'full-buy', team: 'T' },
    ],
  };
}

function newDemo(freezeFrames = 0): ParsedDemo {
  const player = (slot: number, team: Team) => ({
    slot: asPlayerSlot(slot),
    steamId: `7656119800000000${slot}`,
    name: `player ${slot}`,
    team,
  });

  return {
    header: {
      map: 'de_dust2',
      tickRate: TICK_RATE,
      players: [player(0, 'CT'), player(1, 'T')],
      weapons: [],
    },
    track: newTrack(),
    events: {
      rounds: [newRound(freezeFrames)],
      kills: [],
      damage: [],
      shots: [],
      grenades: [],
      blinds: [],
      plants: [],
      defuses: [],
    },
  };
}

const wholeMatch = { side: null, subject: null } satisfies {
  side: Team | null;
  subject: PlayerSlot | null;
};

/** The binning, the kernel and the ramp — which samples count is `walkHeat`'s and tested there. */
describe('heatField', () => {
  it('puts the ramp at 1 on the ground a player held, and nothing where only a body lay', () => {
    const { bins } = heatField(newDemo(), dust2, 'presence', wholeMatch);

    expect(bins[binAt(40, 40)]).toBe(1);
    expect(bins[binAt(80, 60)]).toBeGreaterThan(0);
    expect(bins[binAt(20, 100)]).toBe(0);
  });

  it('spreads a point over its neighbours but not across the map', () => {
    const { bins } = heatField(newDemo(), dust2, 'presence', wholeMatch);

    // The kernel reaches six bins out and thins towards its edge.
    expect(bins[binAt(45, 40)]).toBeGreaterThan(0);
    expect(bins[binAt(45, 40)]).toBeLessThan(sampleAt(bins, binAt(40, 40)));
    // Twelve bins out is past three passes of a radius-2 box.
    expect(bins[binAt(52, 40)]).toBe(0);
    // Two spots far apart stay two spots: nothing lights the ground between them.
    expect(bins[binAt(60, 50)]).toBe(0);
  });

  it('keeps the mode, side and subject figures from the walk', () => {
    const field = heatField(newDemo(), dust2, 'presence', { side: null, subject: asPlayerSlot(1) });

    expect([...field.bySlot]).toEqual([FRAME_COUNT / SAMPLE_HZ, DEATH_FRAME / SAMPLE_HZ]);
    expect(field.total).toBeCloseTo(DEATH_FRAME / SAMPLE_HZ, 5);
    expect(field.bins[binAt(40, 40)]).toBe(0);
  });

  it('draws nothing at all for a mode with nothing in it', () => {
    const { bins, total } = heatField(newDemo(), dust2, 'kills', wholeMatch);

    expect(total).toBe(0);
    expect(bins.every((weight) => weight === 0)).toBe(true);
  });
});
