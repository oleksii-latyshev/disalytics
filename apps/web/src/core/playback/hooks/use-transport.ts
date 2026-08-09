import { openingFrame, type ParsedDemo } from '@disa/demo-core';
import { useEffect, useMemo } from 'react';
import { createTransport, type Transport } from '../helpers/transport';

/**
 * The match's transport, with the one `requestAnimationFrame` loop that drives it. The loop runs
 * only while the clock is playing, and the clock itself never enters React state — `AGENTS.md` §2
 * rule 4.
 */
export function useTransport(demo: ParsedDemo): Transport {
  const transport = useMemo(() => createTransport(demo.track, openingFrame(demo)), [demo]);

  useEffect(() => {
    let handle = 0;
    let previousMs = 0;

    const step = (nowMs: number): void => {
      handle = requestAnimationFrame(step);

      const elapsedMs = previousMs === 0 ? 0 : nowMs - previousMs;
      previousMs = nowMs;

      transport.advance(elapsedMs);
    };

    const sync = (): void => {
      if (transport.clock.isPlaying === (handle !== 0)) return;

      if (handle === 0) {
        previousMs = 0;
        handle = requestAnimationFrame(step);
        return;
      }

      cancelAnimationFrame(handle);
      handle = 0;
    };

    const unsubscribe = transport.subscribeToTransport(sync);
    sync();

    return () => {
      unsubscribe();
      if (handle !== 0) cancelAnimationFrame(handle);
    };
  }, [transport]);

  return transport;
}
