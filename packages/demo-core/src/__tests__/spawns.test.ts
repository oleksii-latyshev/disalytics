import { describe, expect, it } from 'vitest';
import { mergeSpawns, roundStartPositions } from '../helpers/spawns';
import {
  asFrame,
  asPlayerSlot,
  asTick,
  FLAG_ALIVE,
  type ParsedDemo,
  type PlayerEconomy,
  type Round,
} from '../schema';
import { atFrame, newEvents, newTrack } from './helpers';

function economy(slot: number, team: 'CT' | 'T'): PlayerEconomy {
  return { slot: asPlayerSlot(slot), money: 0, equipmentValue: 0, buyType: 'full', team };
}

function round(startTick: number, teams: readonly ('CT' | 'T')[]): Round {
  return {
    number: 1,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 640),
    endTick: asTick(startTick + 2000),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: teams.map((team, slot) => economy(slot, team)),
  };
}

describe('roundStartPositions', () => {
  it('reads each living player one second into the round, under the side the round gave them', () => {
    const track = newTrack({ frameCount: 80, slotCount: 2 });
    // Frame 16 is one second after tick 0; frame 0 still shows the previous round's places.
    atFrame(track, asFrame(0), asPlayerSlot(0), { posX: 999, posY: 999, flags: FLAG_ALIVE });
    atFrame(track, asFrame(16), asPlayerSlot(0), {
      posX: 100,
      posY: 200,
      posZ: 5,
      flags: FLAG_ALIVE,
    });
    atFrame(track, asFrame(16), asPlayerSlot(1), { posX: -100, posY: -200, flags: FLAG_ALIVE });
    atFrame(track, asFrame(16 + 32), asPlayerSlot(0), { posX: 1, posY: 1, flags: FLAG_ALIVE });
    const demo: ParsedDemo = {
      header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
      track,
      events: { ...newEvents(), rounds: [round(0, ['CT', 'T'])] },
    };

    const found = roundStartPositions(demo);

    expect(found.CT).toEqual([{ x: 100, y: 200, z: 5 }]);
    expect(found.T).toEqual([{ x: -100, y: -200, z: 0 }]);
  });

  it('skips a player who is not alive', () => {
    const track = newTrack({ frameCount: 40, slotCount: 1 });
    atFrame(track, asFrame(16), asPlayerSlot(0), { posX: 100, flags: 0 });
    const demo: ParsedDemo = {
      header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
      track,
      events: { ...newEvents(), rounds: [round(0, ['CT'])] },
    };

    expect(roundStartPositions(demo).CT).toEqual([]);
  });
});

describe('mergeSpawns', () => {
  it('drops positions within the merge distance of an earlier one and rounds the rest', () => {
    const merged = mergeSpawns([
      { x: 100.4, y: 50, z: 1 },
      { x: 110, y: 55, z: 1 },
      { x: 400, y: 50, z: 2 },
    ]);

    expect(merged).toEqual([
      { x: 100, y: 50, z: 1 },
      { x: 400, y: 50, z: 2 },
    ]);
  });

  it('sorts by x then y regardless of the order the positions arrived in', () => {
    const a = { x: 0, y: 500, z: 0 };
    const b = { x: 0, y: 100, z: 0 };
    const c = { x: -300, y: 900, z: 0 };

    expect(mergeSpawns([a, b, c])).toEqual(mergeSpawns([c, b, a]));
    expect(mergeSpawns([a, b, c]).map((point) => point.x)).toEqual([-300, 0, 0]);
  });

  it('is stable when run over its own output', () => {
    const once = mergeSpawns([
      { x: 1, y: 1, z: 0 },
      { x: 20, y: 1, z: 0 },
      { x: 60, y: 1, z: 0 },
    ]);

    expect(mergeSpawns(once)).toEqual(once);
  });
});
