import {
  asPlayerSlot,
  asTick,
  type Damage,
  type Kill,
  type ParsedDemo,
  type PlayerEconomy,
  type Round,
  TEAMS,
  type Team,
  type TickTrack,
  WEAPON_NONE,
} from '@disa/demo-core';

export const SAMPLE_HZ = 16;
export const TICK_RATE = 64;

export function newTrack(frameCount: number): TickTrack {
  return {
    tickRate: TICK_RATE,
    sampleHz: SAMPLE_HZ,
    frameCount,
    slotCount: 1,
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

export function newRound(
  number: number,
  startTick: number,
  winner: Round['winner'] = 'CT',
  economy: readonly PlayerEconomy[] = [],
): Round {
  return {
    number,
    startTick: asTick(startTick),
    freezeTimeEndTick: asTick(startTick + 640),
    endTick: asTick(startTick + 6400),
    winner,
    reason: 'all-t-eliminated',
    economy,
  };
}

/** One entry per equipment value, slotted CT side first, as a round reads at freeze-time end. */
export function newBuy(
  perSide: Readonly<Record<Team, readonly number[]>>,
): readonly PlayerEconomy[] {
  const entries: PlayerEconomy[] = [];

  for (const team of TEAMS) {
    for (const equipmentValue of perSide[team]) {
      entries.push({
        slot: asPlayerSlot(entries.length),
        money: 0,
        equipmentValue,
        buyType: 'full-buy',
        team,
      });
    }
  }

  return entries;
}

export function newKill(tick: number, overrides: Partial<Kill> = {}): Kill {
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

export function newDamage(tick: number): Damage {
  return {
    tick: asTick(tick),
    attacker: asPlayerSlot(0),
    victim: asPlayerSlot(1),
    weapon: 'ak47',
    healthDamage: 27,
    armorDamage: 0,
    hitGroup: 'chest',
  };
}

export interface NewDemoOptions {
  rounds?: readonly Round[];
  kills?: readonly Kill[];
  damage?: readonly Damage[];
}

export function newDemo(frameCount: number, options: NewDemoOptions = {}): ParsedDemo {
  return {
    header: { map: 'de_dust2', tickRate: TICK_RATE, players: [], weapons: [] },
    track: newTrack(frameCount),
    events: {
      rounds: options.rounds ?? [],
      kills: options.kills ?? [],
      damage: options.damage ?? [],
      grenades: [],
      blinds: [],
      plants: [],
      defuses: [],
    },
  };
}
