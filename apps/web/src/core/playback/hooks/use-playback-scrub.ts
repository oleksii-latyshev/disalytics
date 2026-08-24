import { useSyncExternalStore } from 'react';
import type { Transport } from '../helpers/transport';

/** The rate a held arrow key is scrubbing at, or `null` — DESIGN.md §9.1. */
export function usePlaybackScrub(transport: Transport): number | null {
  return useSyncExternalStore(transport.subscribeToTransport, () => transport.clock.scrub);
}
