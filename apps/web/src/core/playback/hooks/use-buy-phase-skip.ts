import { buyPhaseSkipFrame, type ParsedDemo } from '@disa/demo-core';
import { useEffect } from 'react';
import type { Transport } from '../helpers/transport';

/**
 * DESIGN.md §10.5's skip-the-buy-phase row, bound to the transport that performs it. The rule is
 * playback's rather than the renderer's, so a reader who scrubs into a buy phase still sees it.
 */
export function useBuyPhaseSkip(transport: Transport, demo: ParsedDemo, isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled) {
      transport.setFrameSkip(null);
      return;
    }

    // perf: called once per animation frame. `buyPhaseSkipFrame` is a binary search over the
    // rounds and allocates nothing; the closure itself is built once per change of the setting.
    transport.setFrameSkip((frame) => buyPhaseSkipFrame(demo, frame));

    return () => transport.setFrameSkip(null);
  }, [transport, demo, isEnabled]);
}
