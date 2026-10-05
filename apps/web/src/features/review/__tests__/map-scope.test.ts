import {
  asFrame,
  asPlayerSlot,
  asTick,
  type Duel,
  type Kill,
  type ParsedDemo,
  type Round,
  type TickTrack,
  WEAPON_NONE,
} from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import {
  DUEL_LEAD_IN_SECONDS,
  DUELS_OPENING,
  hasDuelFilter,
  isInDuelFilter,
  isInNarrowing,
  stageFrameForDuel,
  togglePlayer,
  WHOLE_MATCH,
  withMode,
  withoutFilter,
  withPair,
  withPlayer,
} from '../helpers/map-scope';

const SAMPLE_HZ = 16;
const SLOTS = 2;
const ct = asPlayerSlot(0);
const t = asPlayerSlot(1);

function newTrack(frameCount: number): TickTrack {
  const length = frameCount * SLOTS;

  return {
    tickRate: 64,
    sampleHz: SAMPLE_HZ,
    frameCount,
    slotCount: SLOTS,
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
}

const round: Round = {
  number: 1,
  startTick: asTick(640),
  freezeTimeEndTick: asTick(1280),
  endTick: asTick(8000),
  winner: 'CT',
  reason: 'all-t-eliminated',
  roundTimeSeconds: 115,
  economy: [],
};

const kill: Kill = {
  tick: asTick(1600),
  attacker: ct,
  victim: t,
  assister: null,
  weapon: 'ak47',
  isHeadshot: true,
  isWallbang: false,
  isThroughSmoke: true,
  isNoScope: false,
  isAttackerBlind: false,
  isVictimBlind: false,
  distanceUnits: 800,
};

function newDemo(): ParsedDemo {
  const track = newTrack(500);

  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track,
    events: {
      kills: [kill],
      damage: [],
      shots: [],
      grenades: [],
      blinds: [],
      plants: [],
      defuses: [],
      rounds: [round],
    },
  };
}

const duel: Duel = {
  roundIndex: 0,
  killIndex: 0,
  frame: asFrame(400),
  attacker: ct,
  victim: t,
  attackerSide: 'CT',
  victimSide: 'T',
};

describe('isInNarrowing', () => {
  it('lets everything through on the whole match', () => {
    expect(isInNarrowing(WHOLE_MATCH, 'T', t)).toBe(true);
  });

  it('narrows by side and by any tag that is on', () => {
    expect(isInNarrowing({ side: 'CT', players: [] }, 'T', t)).toBe(false);
    expect(isInNarrowing({ side: 'all', players: [ct] }, 'T', t)).toBe(false);
    expect(isInNarrowing({ side: 'all', players: [ct, t] }, 'T', t)).toBe(true);
  });
});

describe('togglePlayer', () => {
  it('turns a tag on and off again', () => {
    expect(togglePlayer([], t)).toEqual([t]);
    expect(togglePlayer([ct, t], ct)).toEqual([t]);
  });
});

describe('stageFrameForDuel', () => {
  it('lands the lead-in before the kill', () => {
    expect(stageFrameForDuel(newDemo(), duel)).toBe(400 - DUEL_LEAD_IN_SECONDS * SAMPLE_HZ);
  });

  it('never lands before the round started', () => {
    // The round starts at tick 640, frame 160.
    expect(stageFrameForDuel(newDemo(), { ...duel, frame: asFrame(170) })).toBe(160);
  });
});

describe('the duel narrowing', () => {
  const other = asPlayerSlot(2);
  const reverse: Duel = { ...duel, attacker: t, victim: ct };
  const elsewhere: Duel = { ...duel, attacker: other, victim: other };

  it('opens on the openings with nothing filtered', () => {
    expect(DUELS_OPENING).toMatchObject({ mode: 'openings', player: null, pair: null });
    expect(hasDuelFilter(DUELS_OPENING)).toBe(false);
    expect(isInDuelFilter(DUELS_OPENING, duel)).toBe(true);
  });

  it('keeps a player as killer or as victim', () => {
    const narrowing = withPlayer(DUELS_OPENING, ct);

    expect(isInDuelFilter(narrowing, duel)).toBe(true);
    expect(isInDuelFilter(narrowing, reverse)).toBe(true);
    expect(isInDuelFilter(narrowing, elsewhere)).toBe(false);
  });

  it('keeps a pair in both directions', () => {
    const narrowing = withPair(DUELS_OPENING, ct, t);

    expect(isInDuelFilter(narrowing, duel)).toBe(true);
    expect(isInDuelFilter(narrowing, reverse)).toBe(true);
    expect(isInDuelFilter(narrowing, { ...duel, victim: other })).toBe(false);
  });

  it('lets go of what is pressed twice, and one filter replaces the other', () => {
    expect(withPlayer(withPlayer(DUELS_OPENING, ct), ct).player).toBeNull();
    expect(withPair(withPair(DUELS_OPENING, ct, t), ct, t).pair).toBeNull();
    expect(withPair(withPlayer(DUELS_OPENING, ct), ct, t).player).toBeNull();
    expect(withPlayer(withPair(DUELS_OPENING, ct, t), ct).pair).toBeNull();
  });

  it('keeps the filter across a mode and drops the chosen duel', () => {
    const narrowing = withMode({ ...withPlayer(DUELS_OPENING, ct), duel: 3 }, 'all');

    expect(narrowing).toMatchObject({ mode: 'all', player: ct, duel: null });
  });

  it('resets to every duel of the mode', () => {
    const narrowing = withoutFilter({ ...withPair(DUELS_OPENING, ct, t), mode: 'all', duel: 1 });

    expect(narrowing).toEqual({ mode: 'all', player: null, pair: null, duel: null });
  });
});
