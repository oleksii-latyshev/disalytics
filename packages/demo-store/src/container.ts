import type { Grenade, MatchEvents, MatchHeader, Tick } from '@disa/demo-core';
import { isRecord } from './guards';

/** `DISA` read little-endian, so the first four bytes of a container spell it. */
export const CONTAINER_MAGIC = 0x41_53_49_44;

/**
 * The container's own layout, versioned separately from `SCHEMA_VERSION`: this number moves when
 * the bytes around the data change, that one when the data does. A mismatch in either is a miss.
 */
export const CONTAINER_FORMAT = 1;

/** magic, format, meta length — three `u32` before the meta block starts. */
export const PREFIX_BYTES = 12;

export interface BufferSlot {
  offset: number;
  byteLength: number;
}

export interface StoredTrack {
  tickRate: number;
  sampleHz: number;
  frameCount: number;
  slotCount: number;
  buffers: {
    posX: number;
    posY: number;
    posZ: number;
    yaw: number;
    pitch: number;
    health: number;
    flags: number;
    speed: number;
  };
}

export interface StoredTrajectory {
  sampleHz: number;
  firstTick: Tick;
  sampleCount: number;
  buffers: { x: number; y: number; z: number };
}

export interface StoredGrenade extends Omit<Grenade, 'trajectory'> {
  trajectory: StoredTrajectory;
}

export interface StoredEvents extends Omit<MatchEvents, 'grenades'> {
  grenades: readonly StoredGrenade[];
}

/**
 * Everything but the typed arrays, which live in the payload after it and are named here by their
 * index into `buffers`.
 */
export interface StoredMeta {
  schemaVersion: number;
  header: MatchHeader;
  track: StoredTrack;
  events: StoredEvents;
  buffers: readonly BufferSlot[];
}

/** A container this code wrote and can no longer read. The store treats one as a miss. */
export class CorruptCacheError extends Error {
  constructor(readonly detail: string) {
    super(`the cached demo could not be read: ${detail}`);
    this.name = 'CorruptCacheError';
  }
}

export function slotAt(buffers: readonly BufferSlot[], index: number): BufferSlot {
  const slot = buffers[index];
  if (slot === undefined) throw new CorruptCacheError(`buffer ${index} is missing`);
  return slot;
}

function hasArrays(events: Record<string, unknown>): boolean {
  const names = ['rounds', 'kills', 'damage', 'grenades', 'blinds', 'plants', 'defuses'];
  return names.every((name) => Array.isArray(events[name]));
}

/**
 * Shallow by design. A container is written by this file's own encoder, so the check that earns its
 * place is the envelope — the parts a truncated write or a stale format can break. Validating the
 * whole event schema again would restate `demo-core` in a second place and drift from it.
 */
export function isStoredMeta(value: unknown): value is StoredMeta {
  if (!isRecord(value)) return false;
  if (typeof value.schemaVersion !== 'number') return false;
  if (!isRecord(value.header) || !isRecord(value.track)) return false;
  if (!isRecord(value.events) || !hasArrays(value.events)) return false;

  const buffers = value.buffers;
  return (
    Array.isArray(buffers) &&
    buffers.every(
      (slot: unknown) =>
        isRecord(slot) && typeof slot.offset === 'number' && typeof slot.byteLength === 'number',
    )
  );
}
