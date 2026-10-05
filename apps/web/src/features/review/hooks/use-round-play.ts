import { useCallback, useEffect, useState } from 'react';
import { PLAY_LAST_STEP } from '../helpers/heat-range';

/** How long a window of *Play round* stays before the next. */
const STEP_MS = 450;

export interface RoundPlay {
  /** The step the played round is on, or `null` while it is not playing. */
  readonly step: number | null;
  readonly start: () => void;
  readonly stop: () => void;
}

/**
 * *Play round*: a window that walks the round, one step of the axis at a time.
 *
 * It is a timer and a number, and the picture is rebuilt by the screen when the number changes —
 * nothing in a draw reads it. **One timeout at a time, cleared on every change and on unmount**, so
 * leaving the view ends it; it ends by itself after the last window.
 */
export function useRoundPlay(): RoundPlay {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (step === null) return;

    const timer = setTimeout(
      () =>
        setStep((current) => (current === null || current >= PLAY_LAST_STEP ? null : current + 1)),
      STEP_MS,
    );

    return () => clearTimeout(timer);
  }, [step]);

  const start = useCallback(() => setStep(0), []);
  const stop = useCallback(() => setStep(null), []);

  return { step, start, stop };
}
