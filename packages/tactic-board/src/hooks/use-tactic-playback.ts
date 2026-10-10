import { frameElapsedMs } from '@disa/demo-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { advanceTacticClock, createTacticClock } from '../helpers/tactic-clock';
import { stepIndexAt, type TacticSchedule } from '../helpers/tactic-schedule';

/** AGENTS.md §8: anything read as text follows the clock at 10 Hz, not at the rate it moves. */
const READOUT_INTERVAL_MS = 100;

interface Options {
  readonly schedule: TacticSchedule;
  readonly stepIndex: number;
  readonly onStepChange: (index: number) => void;
  /** Paints the plate; the animation loop calls it every frame, outside React. */
  readonly repaint: () => void;
}

/**
 * Plays the schedule on a frame clock. The clock is a plain object; React sees only whether it is
 * playing and its speed, and a readout that ticks at 10 Hz.
 */
export function useTacticPlayback({ schedule, stepIndex, onStepChange, repaint }: Options) {
  const clock = useMemo(createTacticClock, []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShown, setIsShown] = useState(false);
  const [speed, setSpeedState] = useState(clock.speed);

  const latest = useRef({ schedule, stepIndex, onStepChange, repaint });
  latest.current = { schedule, stepIndex, onStepChange, repaint };

  const pause = useCallback(() => {
    clock.isPlaying = false;
    setIsPlaying(false);
  }, [clock]);

  const stop = useCallback(() => {
    clock.isPlaying = false;
    clock.isShown = false;
    setIsPlaying(false);
    setIsShown(false);
    latest.current.repaint();
  }, [clock]);

  const play = useCallback(() => {
    const { schedule: plan, stepIndex: index } = latest.current;
    const isAtEnd = clock.isShown && clock.time >= plan.totalSeconds;
    if (!clock.isShown || isAtEnd) clock.time = plan.steps[isAtEnd ? 0 : index]?.startSeconds ?? 0;
    clock.isPlaying = true;
    clock.isShown = true;
    setIsPlaying(true);
    setIsShown(true);
  }, [clock]);

  const toggle = useCallback(() => (clock.isPlaying ? pause() : play()), [clock, pause, play]);

  const setSpeed = useCallback(
    (next: number) => {
      clock.speed = next;
      setSpeedState(next);
    },
    [clock],
  );

  useEffect(() => {
    if (!isPlaying) return;
    let handle = 0;
    let previousMs = 0;
    let lastStep = -1;

    const frame = (nowMs: number): void => {
      const { schedule: plan, onStepChange: follow, repaint: paint } = latest.current;
      const isMore = advanceTacticClock(
        clock,
        frameElapsedMs(previousMs, nowMs),
        plan.totalSeconds,
      );
      previousMs = nowMs;

      const index = stepIndexAt(plan, clock.time);
      if (index !== lastStep) {
        lastStep = index;
        follow(index);
      }
      paint();

      if (!isMore) {
        clock.isPlaying = false;
        setIsPlaying(false);
        return;
      }
      handle = requestAnimationFrame(frame);
    };

    const forgetPreviousFrame = (): void => {
      previousMs = 0;
    };

    document.addEventListener('visibilitychange', forgetPreviousFrame);
    handle = requestAnimationFrame(frame);
    return () => {
      document.removeEventListener('visibilitychange', forgetPreviousFrame);
      cancelAnimationFrame(handle);
    };
  }, [clock, isPlaying]);

  return { clock, isPlaying, isShown, speed, play, pause, toggle, stop, setSpeed };
}

/** The clock's time as text can read it: refreshed at 10 Hz while it moves. */
export function useClockReadout(clock: { readonly time: number }, isActive: boolean): number {
  const [seconds, setSeconds] = useState(clock.time);

  useEffect(() => {
    setSeconds(clock.time);
    if (!isActive) return;
    const timer = setInterval(() => setSeconds(clock.time), READOUT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [clock, isActive]);

  return seconds;
}
