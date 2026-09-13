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
  duelDetail,
  isInNarrowing,
  stageFrameForDuel,
  togglePlayer,
  WHOLE_MATCH,
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
  // One sample before the kill (frame 400): the attacker hurt, the victim holding the second weapon.
  const before = 399 * SLOTS;
  track.health[before + ct] = 62;
  track.armour[before + ct] = 40;
  track.health[before + t] = 100;
  track.armour[before + t] = 100;
  track.weapon[before + t] = 1;

  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: ['AK-47', 'AWP'] },
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

describe('duelDetail', () => {
  it('reads both players one sample before the kill, and the marks off the kill', () => {
    const detail = duelDetail(newDemo(), duel);

    expect(detail?.attacker).toMatchObject({ health: 62, armour: 40 });
    expect(detail?.attacker.weapon?.name).toBe('AK-47');
    expect(detail?.victim).toMatchObject({ health: 100, armour: 100 });
    expect(detail?.victim.weapon?.name).toBe('AWP');
    expect(detail).toMatchObject({ isHeadshot: true, isWallbang: false, isThroughSmoke: true });
  });

  it('says nothing was in hand when the recording saw nothing', () => {
    const demo = newDemo();
    demo.track.weapon[399 * SLOTS + t] = WEAPON_NONE;

    expect(duelDetail(demo, duel)?.victim.weapon).toBeNull();
  });
});
