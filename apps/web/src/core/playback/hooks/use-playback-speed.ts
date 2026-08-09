import { useSyncExternalStore } from 'react';
import type { Transport } from '../helpers/transport';

export function usePlaybackSpeed(transport: Transport): number {
  return useSyncExternalStore(transport.subscribeToTransport, () => transport.clock.speed);
}
