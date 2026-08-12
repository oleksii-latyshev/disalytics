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
  CorruptCacheError,
  isStoredMeta,
  PREFIX_BYTES,
  type StoredGrenade,
  type StoredMeta,
  type StoredTrajectory,
  slotAt,
} from './container';

type Payload = Uint8Array<ArrayBuffer>;

interface Body {
  meta: StoredMeta;
  payload: Payload;
}

function bytesOf(payload: Payload, index: number, buffers: readonly BufferSlot[]): ArrayBuffer {
  const slot = slotAt(buffers, index);
  const start = payload.byteOffset + slot.offset;
  const end = start + slot.byteLength;

  if (slot.offset < 0 || end > payload.byteOffset + payload.byteLength) {
    throw new CorruptCacheError(`buffer ${index} runs past the end of the container`);
  }

  return payload.buffer.slice(start, end);
}

function readPrefix(bytes: Payload): number {
  if (bytes.byteLength < PREFIX_BYTES) throw new CorruptCacheError('shorter than its own prefix');

  const fields = new DataView(bytes.buffer, bytes.byteOffset, PREFIX_BYTES);

  if (fields.getUint32(0, true) !== CONTAINER_MAGIC) throw new CorruptCacheError('not a container');
  if (fields.getUint32(4, true) !== CONTAINER_FORMAT) throw new CorruptCacheError('another format');

  return fields.getUint32(8, true);
}

function readBody(bytes: Payload): Body {
  const metaByteLength = readPrefix(bytes);
  const payloadStart = PREFIX_BYTES + metaByteLength;

  if (payloadStart > bytes.byteLength) throw new CorruptCacheError('truncated before its payload');

  const text = new TextDecoder().decode(bytes.subarray(PREFIX_BYTES, payloadStart));
  const meta: unknown = JSON.parse(text);

  if (!isStoredMeta(meta)) throw new CorruptCacheError('the meta block is not one of ours');
  if (meta.schemaVersion !== SCHEMA_VERSION) throw new CorruptCacheError('another schema version');

  return { meta, payload: bytes.subarray(payloadStart) };
}

function decodeTrack({ meta, payload }: Body): TickTrack {
  const { track, buffers } = meta;
  const at = (index: number) => bytesOf(payload, index, buffers);

  return {
    tickRate: track.tickRate,
    sampleHz: track.sampleHz,
    frameCount: track.frameCount,
    slotCount: track.slotCount,
    posX: new Float32Array(at(track.buffers.posX)),
    posY: new Float32Array(at(track.buffers.posY)),
    posZ: new Float32Array(at(track.buffers.posZ)),
    yaw: new Int16Array(at(track.buffers.yaw)),
    pitch: new Int16Array(at(track.buffers.pitch)),
    health: new Uint8Array(at(track.buffers.health)),
    flags: new Uint8Array(at(track.buffers.flags)),
    speed: new Uint16Array(at(track.buffers.speed)),
    armour: new Uint8Array(at(track.buffers.armour)),
    weapon: new Uint8Array(at(track.buffers.weapon)),
    grenades: new Uint8Array(at(track.buffers.grenades)),
    money: new Uint16Array(at(track.buffers.money)),
  };
}

function decodeTrajectory(
  stored: StoredTrajectory,
  payload: Payload,
  buffers: readonly BufferSlot[],
): GrenadeTrajectory {
  return {
    sampleHz: stored.sampleHz,
    firstTick: stored.firstTick,
    sampleCount: stored.sampleCount,
    x: new Float32Array(bytesOf(payload, stored.buffers.x, buffers)),
    y: new Float32Array(bytesOf(payload, stored.buffers.y, buffers)),
    z: new Float32Array(bytesOf(payload, stored.buffers.z, buffers)),
  };
}

function decodeGrenade(
  stored: StoredGrenade,
  payload: Payload,
  buffers: readonly BufferSlot[],
): Grenade {
  const { trajectory, ...rest } = stored;

  return { ...rest, trajectory: decodeTrajectory(trajectory, payload, buffers) };
}

function decodeEvents({ meta, payload }: Body): MatchEvents {
  return {
    ...meta.events,
    grenades: meta.events.grenades.map((grenade) => decodeGrenade(grenade, payload, meta.buffers)),
  };
}

/** Throws `CorruptCacheError` rather than returning a partial demo. The caller reads that as a miss. */
export function decodeDemo(bytes: Payload): ParsedDemo {
  const body = readBody(bytes);

  return {
    header: body.meta.header,
    track: decodeTrack(body),
    events: decodeEvents(body),
  };
}
