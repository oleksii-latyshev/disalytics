import { asFrame, type Frame } from '@disa/demo-core';
import { useEffect, useState } from 'react';
import type { Transport } from '../helpers/transport';

/** `AGENTS.md` §8 — anything read as text updates at 10 Hz, not at the rate the clock moves. */
const READOUT_INTERVAL_MS = 100;

/**
 * The sample the clock currently stands on, sampled slowly enough to render from. Everything drawn
 * per frame reads `transport.clock` instead.
 */
export function useFrameReadout(transport: Transport): Frame {
  const [frame, setFrame] = useState(() => asFrame(Math.floor(transport.clock.frame)));

  useEffect(() => {
    const read = () => setFrame(asFrame(Math.floor(transport.clock.frame)));
    read();

    const timer = setInterval(read, READOUT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [transport]);

  return frame;
}
