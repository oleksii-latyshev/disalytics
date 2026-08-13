import type { Grenade, MatchEvents, MatchHeader, ParsedDemo, TickTrack } from '@disa/demo-core';
import { asFrame, asPlayerSlot, asTick, DEFAULT_SAMPLE_HZ } from '@disa/demo-core';
import { atFrame, newTrack } from '@disa/demo-core/test-helpers';
import type { StoreBackend } from '../backend';

const FRAME_COUNT = 4;
const SLOT_COUNT = 2;

/** Every buffer carries a different value, so a codec that crossed two of them fails rather than passes. */
function newFilledTrack(): TickTrack {
  const track = newTrack({ frameCount: FRAME_COUNT, slotCount: SLOT_COUNT });

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
      atFrame(track, asFrame(frame), asPlayerSlot(slot), {
        posX: frame * 1.5,
        posY: -slot,
        posZ: 64,
        yawDegrees: frame * 10,
        pitchDegrees: -slot,
        health: 100 - frame,
        flags: slot + 1,
        speed: frame * 8,
        armour: 100 - slot,
        weapon: slot % 3,
        grenades: frame + 1,
        money: frame * 100 + slot,
      });
    }
  }

  return track;
}

function newGrenade(): Grenade {
  return {
    thrower: asPlayerSlot(1),
    type: 'smokegrenade',
    throwTick: asTick(120),
    detonationTick: asTick(160),
    detonationPosition: { x: 12, y: -4, z: 64 },
    expiryTick: null,
    trajectory: {
      sampleHz: DEFAULT_SAMPLE_HZ,
      firstTick: asTick(120),
      sampleCount: 3,
      x: Float32Array.from([1, 2, 3]),
      y: Float32Array.from([-1, -2, -3]),
      z: Float32Array.from([64, 72, 80]),
    },
  };
}

function newEvents(): MatchEvents {
  return {
    rounds: [
      {
        number: 1,
        startTick: asTick(0),
        freezeTimeEndTick: asTick(64),
        endTick: asTick(1000),
        winner: 'CT',
        reason: 'all-t-eliminated',
        economy: [
          {
            slot: asPlayerSlot(0),
            money: 800,
            equipmentValue: 1000,
            buyType: 'pistol',
            team: 'CT',
          },
          { slot: asPlayerSlot(1), money: 800, equipmentValue: 850, buyType: 'pistol', team: 'T' },
        ],
      },
    ],
    kills: [
      {
        tick: asTick(200),
        attacker: asPlayerSlot(0),
        victim: asPlayerSlot(1),
        assister: null,
        weapon: 'ak47',
        isHeadshot: true,
        isWallbang: false,
        isThroughSmoke: false,
        isNoScope: false,
        isAttackerBlind: false,
        isVictimBlind: false,
        distanceUnits: 812.5,
      },
    ],
    damage: [],
    grenades: [newGrenade()],
    blinds: [],
    plants: [{ tick: asTick(300), planter: asPlayerSlot(0), siteEntityId: 41 }],
    defuses: [],
  };
}

function newHeader(): MatchHeader {
  return {
    map: 'de_mirage',
    tickRate: 64,
    players: [
      { slot: asPlayerSlot(0), steamId: '76561197960287930', name: 'one', team: 'CT' },
      { slot: asPlayerSlot(1), steamId: '76561197960287931', name: 'two', team: 'T' },
    ],
    weapons: ['AK-47', 'AWP', 'Knife'],
  };
}

export function newDemo(): ParsedDemo {
  return { header: newHeader(), track: newFilledTrack(), events: newEvents() };
}

export interface FakeBackend extends StoreBackend {
  readonly files: Map<string, Uint8Array<ArrayBuffer>>;
  writes: number;
}

function joined(chunks: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

export function newBackend(files: Map<string, Uint8Array<ArrayBuffer>> = new Map()): FakeBackend {
  const backend: FakeBackend = {
    kind: 'opfs',
    files,
    writes: 0,
    read: (name) => Promise.resolve(files.get(name) ?? null),
    write: (name, chunks) => {
      backend.writes += 1;
      files.set(name, joined(chunks));

      return Promise.resolve();
    },
    remove: (name) => {
      files.delete(name);

      return Promise.resolve();
    },
    list: () => Promise.resolve([...files.keys()]),
  };

  return backend;
}
