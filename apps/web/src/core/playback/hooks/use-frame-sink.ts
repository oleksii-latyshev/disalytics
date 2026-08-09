import { useEffect } from 'react';
import type { Transport } from '../helpers/transport';

/**
 * Runs `sink` once per animation frame while the match plays, and once for every seek. It has to
 * keep its identity across renders, or the subscription is torn down and rebuilt mid-playback — and
 * it must not write React state: that is what the transport channel is for.
 */
export function useFrameSink(transport: Transport, sink: () => void): void {
  useEffect(() => transport.subscribeToFrames(sink), [transport, sink]);
}
