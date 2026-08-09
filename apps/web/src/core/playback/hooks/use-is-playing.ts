import { useSyncExternalStore } from 'react';
import type { Transport } from '../helpers/transport';

export function useIsPlaying(transport: Transport): boolean {
  return useSyncExternalStore(transport.subscribeToTransport, () => transport.clock.isPlaying);
}
