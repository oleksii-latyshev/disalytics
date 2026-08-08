import type {
  Grenade,
  GrenadeTrajectory,
  MatchEvents,
  ParsedDemo,
  TickTrack,
} from '@disa/demo-core';
import { SCHEMA_VERSION } from '@disa/demo-core';
import {
  type BufferSlot,
  CONTAINER_FORMAT,
  CONTAINER_MAGIC,
  PREFIX_BYTES,
  type StoredEvents,
  type StoredGrenade,
  type StoredMeta,
  type StoredTrack,
  type StoredTrajectory,
} from './container';

interface BufferTable {
  slots: BufferSlot[];
  payload: Uint8Array<ArrayBuffer>[];
  offset: number;
}

function append(table: BufferTable, view: ArrayBufferView<ArrayBuffer>): number {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

  table.slots.push({ offset: table.offset, byteLength: bytes.byteLength });
  table.payload.push(bytes);
  table.offset += bytes.byteLength;

  return table.slots.length - 1;
}

function encodeTrack(track: TickTrack, table: BufferTable): StoredTrack {
  return {
    tickRate: track.tickRate,
    sampleHz: track.sampleHz,
    frameCount: track.frameCount,
    slotCount: track.slotCount,
    buffers: {
      posX: append(table, track.posX),
      posY: append(table, track.posY),
      posZ: append(table, track.posZ),
      yaw: append(table, track.yaw),
      pitch: append(table, track.pitch),
      health: append(table, track.health),
      flags: append(table, track.flags),
      speed: append(table, track.speed),
    },
  };
}

function encodeTrajectory(trajectory: GrenadeTrajectory, table: BufferTable): StoredTrajectory {
  return {
    sampleHz: trajectory.sampleHz,
    firstTick: trajectory.firstTick,
    sampleCount: trajectory.sampleCount,
    buffers: {
      x: append(table, trajectory.x),
      y: append(table, trajectory.y),
      z: append(table, trajectory.z),
    },
  };
}

function encodeGrenade(grenade: Grenade, table: BufferTable): StoredGrenade {
  const { trajectory, ...rest } = grenade;

  return { ...rest, trajectory: encodeTrajectory(trajectory, table) };
}

function encodeEvents(events: MatchEvents, table: BufferTable): StoredEvents {
  return {
    ...events,
    grenades: events.grenades.map((grenade) => encodeGrenade(grenade, table)),
  };
}

function encodePrefix(metaByteLength: number): Uint8Array<ArrayBuffer> {
  const prefix = new Uint8Array(PREFIX_BYTES);
  const fields = new DataView(prefix.buffer);

  fields.setUint32(0, CONTAINER_MAGIC, true);
  fields.setUint32(4, CONTAINER_FORMAT, true);
  fields.setUint32(8, metaByteLength, true);

  return prefix;
}

/**
 * Chunks rather than one buffer: the typed arrays are handed to the backend as they already are,
 * so a demo is never copied into a second contiguous allocation on the way to disk.
 *
 * Byte-identical for the same demo, which is what lets `${fingerprint}:${SCHEMA_VERSION}` mean
 * anything — `CODE_REQUIREMENTS.md` §3.
 */
export function encodeDemo(demo: ParsedDemo): Uint8Array<ArrayBuffer>[] {
  const table: BufferTable = { slots: [], payload: [], offset: 0 };
  const track = encodeTrack(demo.track, table);
  const events = encodeEvents(demo.events, table);

  const meta: StoredMeta = {
    schemaVersion: SCHEMA_VERSION,
    header: demo.header,
    track,
    events,
    buffers: table.slots,
  };
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));

  return [encodePrefix(metaBytes.byteLength), metaBytes, ...table.payload];
}

export function byteLengthOf(chunks: readonly Uint8Array[]): number {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
}
