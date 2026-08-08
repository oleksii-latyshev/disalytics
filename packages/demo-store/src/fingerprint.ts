import { SCHEMA_VERSION } from '@disa/demo-core';

/**
 * How much of each end of the file the digest covers.
 *
 * A demo runs to hundreds of megabytes, and `crypto.subtle.digest` has no streaming form — hashing
 * one whole would put the file in the JavaScript heap, which is the allocation the parser's own
 * streaming read exists to avoid, and would spend a large part of the §16 three-second budget on
 * every cache hit. The ends plus the size and the modification time separate demos in practice: a
 * collision needs two recordings of the same byte length, modified in the same millisecond, with
 * identical first and last megabytes and a difference only in between.
 */
const SAMPLE_BYTES = 1024 * 1024;

function toHex(digest: ArrayBuffer): string {
  let text = '';

  for (const byte of new Uint8Array(digest)) text += byte.toString(16).padStart(2, '0');

  return text;
}

async function sampleOf(file: File): Promise<Uint8Array<ArrayBuffer>> {
  const identity = new TextEncoder().encode(`${file.size}:${file.lastModified}:`);
  const head = new Uint8Array(await file.slice(0, SAMPLE_BYTES).arrayBuffer());
  const tail = new Uint8Array(
    await file.slice(Math.max(0, file.size - SAMPLE_BYTES)).arrayBuffer(),
  );

  const sample = new Uint8Array(identity.byteLength + head.byteLength + tail.byteLength);
  sample.set(identity, 0);
  sample.set(head, identity.byteLength);
  sample.set(tail, identity.byteLength + head.byteLength);

  return sample;
}

export function canFingerprint(): boolean {
  return typeof globalThis.crypto?.subtle?.digest === 'function';
}

/**
 * The name is left out on purpose: renaming a demo is not a different demo, and a copy that keeps
 * its modification time should still hit.
 */
export async function fingerprintFile(file: File): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', await sampleOf(file)));
}

export async function demoKeyFor(file: File): Promise<string> {
  return `${await fingerprintFile(file)}:${SCHEMA_VERSION}`;
}

export function schemaVersionOf(key: string): number | null {
  const separator = key.lastIndexOf(':');
  if (separator === -1) return null;

  const version = Number(key.slice(separator + 1));

  return Number.isInteger(version) ? version : null;
}
