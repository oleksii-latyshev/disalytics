import type { TacticStep } from '@disa/demo-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeTotalDuration } from '../helpers/editor-actions';
import { findActiveStepIndex } from '../helpers/tactic-interpolation';

interface UseTacticPlaybackOptions {
  readonly steps: readonly TacticStep[];
  readonly activeStepIndex: number;
  readonly setActiveStepIndex: (index: number) => void;
}

export function useTacticPlayback({
  steps,
  activeStepIndex,
  setActiveStepIndex,
}: UseTacticPlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Last step offset + 3s margin, min 5s
  const totalDuration = useMemo(() => computeTotalDuration(steps), [steps]);

  const lastTimeRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (wasPlayingRef.current && !isPlaying) {
      setActiveStepIndex(findActiveStepIndex(steps, playbackTime));
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, playbackTime, steps, setActiveStepIndex]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      } else {
        const deltaSeconds = ((now - lastTimeRef.current) / 1000) * playbackSpeed;
        lastTimeRef.current = now;

        setPlaybackTime((prev) => {
          const next = prev + deltaSeconds;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, totalDuration]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && playbackTime >= totalDuration) {
        setPlaybackTime(0);
      }
      return !prev;
    });
  }, [playbackTime, totalDuration]);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      setPlaybackTime(clamped);
      setActiveStepIndex(findActiveStepIndex(steps, clamped));
    },
    [totalDuration, steps, setActiveStepIndex],
  );

  const selectStep = useCallback(
    (index: number) => {
      setActiveStepIndex(index);
      const step = steps[index];
      if (step !== undefined) {
        setPlaybackTime(step.timeOffsetSeconds);
      }
    },
    [steps, setActiveStepIndex],
  );

  const jumpStep = useCallback(
    (direction: 'prev' | 'next') => {
      const targetIndex =
        direction === 'prev'
          ? Math.max(0, activeStepIndex - 1)
          : Math.min(steps.length - 1, activeStepIndex + 1);

      selectStep(targetIndex);
    },
    [activeStepIndex, steps.length, selectStep],
  );

  return {
    state: { isPlaying, playbackTime, playbackSpeed, totalDuration },
    setPlaybackSpeed,
    togglePlay,
    seek,
    jumpStep,
    selectStep,
  };
}
