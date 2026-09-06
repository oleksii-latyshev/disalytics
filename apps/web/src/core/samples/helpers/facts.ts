import { SCHEMA_VERSION } from '@disa/demo-core';
import { SAMPLE_ASSETS } from '../generated/assets';
import type { SampleId } from './catalogue';

/**
 * A sample's place in the store. It ends in the schema version for the same reason a demo's key
 * does: `staleKeys` drops an entry whose key names another one, so a bumped `SCHEMA_VERSION` clears
 * the stored sample the same day it makes the shipped container unreadable, and the next press
 * downloads the one that build carries.
 */
export function sampleKey(id: SampleId): string {
  return `sample:${id}:${SCHEMA_VERSION}`;
}

/** What a press will cost on the wire, which is the one thing a card promises before it is made. */
export function sampleByteLength(id: SampleId): number {
  return SAMPLE_ASSETS[id].byteLength;
}
