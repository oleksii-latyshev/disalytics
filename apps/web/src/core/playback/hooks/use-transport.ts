import { openingFrame, type ParsedDemo } from '@disa/demo-core';
import { useEffect, useMemo } from 'react';
import { frameElapsedMs } from '../helpers/frame-step';
import { bindPlayingFlag } from '../helpers/playing-flag';
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

      const elapsedMs = frameElapsedMs(previousMs, nowMs);
      previousMs = nowMs;

      transport.advance(elapsedMs);
    };

    // Hiding the tab suspends the loop; showing it resumes one whose last timestamp is however long
    // ago the reader left. Forgetting it makes the first frame back cost nothing, which the ceiling
    // in `frameElapsedMs` alone cannot do — it can only make the jump small.
    const forgetPreviousFrame = (): void => {
      previousMs = 0;
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

    document.addEventListener('visibilitychange', forgetPreviousFrame);
    const unsubscribe = transport.subscribeToTransport(sync);
    sync();

    return () => {
      document.removeEventListener('visibilitychange', forgetPreviousFrame);
      unsubscribe();
      if (handle !== 0) cancelAnimationFrame(handle);
    };
  }, [transport]);

  // Bound here rather than by the screen: a rule the interface cannot animate around is worth more
  // than a hook someone has to remember to mount — DESIGN.md §8.
  useEffect(() => bindPlayingFlag(transport, document.documentElement), [transport]);

  return transport;
}
