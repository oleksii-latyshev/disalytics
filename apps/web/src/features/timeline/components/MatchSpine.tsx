import { type Frame, lastFrame, type ParsedDemo, secondsAtFrame } from '@disa/demo-core';
import { useLocale, useT } from '@disa/i18n';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { createClockFormat, formatClock, type Transport, useFrameSink } from '@/core/playback';
import { positionOnSpine, roundBoundaries } from '../helpers/spine';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  frame: Frame;
}

export function MatchSpine({ demo, transport, frame }: Props) {
  const t = useT();
  const locale = useLocale();

  const stripRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);

  const end = lastFrame(demo.track);
  const boundaries = useMemo(() => roundBoundaries(demo), [demo]);
  const format = useMemo(() => createClockFormat(locale), [locale]);

  // Moves with `transform` only, which is what keeps playback off the main thread — DESIGN.md §6.
  const syncPlayhead = useCallback(() => {
    const playhead = playheadRef.current;
    if (playhead === null) return;

    const offsetPx = positionOnSpine(transport.clock.frame, end, widthRef.current);
    playhead.style.transform = `translateX(${offsetPx}px)`;

    const input = inputRef.current;
    if (input === null || isScrubbingRef.current) return;

    // The range only carries whole samples, so it is written when one turns over rather than on
    // every animation frame — at 16 Hz against a 120 Hz display that is most frames skipped.
    const sample = Math.round(transport.clock.frame);
    if (input.valueAsNumber !== sample) input.value = String(sample);
  }, [transport, end]);

  useFrameSink(transport, syncPlayhead);

  useEffect(() => {
    const strip = stripRef.current;
    if (strip === null) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry === undefined) return;

      widthRef.current = entry.contentRect.width;
      syncPlayhead();
    });
    observer.observe(strip);

    return () => observer.disconnect();
  }, [syncPlayhead]);

  useEffect(() => {
    const endScrub = (): void => {
      if (!isScrubbingRef.current) return;

      isScrubbingRef.current = false;
      if (wasPlayingRef.current) transport.resume();
    };

    window.addEventListener('pointerup', endScrub);
    window.addEventListener('pointercancel', endScrub);

    return () => {
      window.removeEventListener('pointerup', endScrub);
      window.removeEventListener('pointercancel', endScrub);
    };
  }, [transport]);

  function handlePointerDown(): void {
    isScrubbingRef.current = true;
    wasPlayingRef.current = transport.clock.isPlaying;
    transport.pause();
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>): void {
    transport.seek(Number(event.currentTarget.value));
  }

  return (
    <div
      ref={stripRef}
      className="relative h-24 overflow-hidden rounded-instrument border border-line bg-surface-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus"
    >
      {boundaries.map((boundary) => (
        <div
          key={boundary.round}
          className="absolute inset-y-0 w-px bg-line"
          style={{ left: `${boundary.fraction * 100}%` }}
        />
      ))}

      <div ref={playheadRef} className="absolute inset-y-0 left-0 w-px bg-playhead" />

      <input
        ref={inputRef}
        type="range"
        min={0}
        max={end}
        step={1}
        defaultValue={transport.clock.frame}
        aria-label={t('timeline.position')}
        aria-valuetext={formatClock(format, secondsAtFrame(demo.track, frame))}
        onPointerDown={handlePointerDown}
        onInput={handleInput}
        className="absolute inset-0 size-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-24 [&::-moz-range-thumb]:w-px [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-24 [&::-webkit-slider-thumb]:w-px [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
      />
    </div>
  );
}
