import { type Frame, openingFrame, type ParsedDemo } from '@disa/demo-core';
import { useEffect, useMemo } from 'react';
import { frameElapsedMs } from '../helpers/frame-step';
import { createTransport, type Transport } from '../helpers/transport';

/**
 * The match's transport, with the one `requestAnimationFrame` loop that drives it. The loop runs
 * only while the clock is playing, and the clock itself never enters React state — `AGENTS.md` §2
 * rule 4.
 *
 * `startFrame` is where the match opens. It defaults to the first round, and the one caller that
 * passes anything else is a reader who chose a round in §10.2's dialog before the match existed to
 * choose one in. It is read once: the transport is rebuilt only when the demo changes.
 */
export function useTransport(demo: ParsedDemo, startFrame?: Frame): Transport {
  const transport = useMemo(
    () => createTransport(demo.track, startFrame ?? openingFrame(demo)),
    [demo, startFrame],
  );

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

  return transport;
}
