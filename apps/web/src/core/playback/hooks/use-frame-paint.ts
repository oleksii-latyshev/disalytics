import { useEffect } from 'react';
import type { Transport } from '../helpers/transport';

/**
 * Draws once per animation frame while the match plays. `paint` has to keep its identity across
 * renders, or the subscription is torn down and rebuilt mid-playback.
 */
export function useFramePaint(transport: Transport, paint: () => void): void {
  useEffect(() => transport.subscribeToFrames(paint), [transport, paint]);
}
