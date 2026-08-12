import { lastFrame, type ParsedDemo, secondsAtFrame } from '@disa/demo-core';
import { useLocale, useT } from '@disa/i18n';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createClockFormat,
  formatClock,
  type Transport,
  useFrameReadout,
  useFrameSink,
} from '@/core/playback';
import { killMarkers, namesBySlot, positionOnSpine } from '../helpers/spine';
import { KillMarkers } from './KillMarkers';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

/**
 * The strip between play/pause and the speed control, and the position control of the whole screen
 * — DESIGN.md §7.1. It still spans the match rather than one round: §7.1's round-scoped axis, its
 * buy-phase region and its event glyphs are the next step's, and this is where they land.
 *
 * The range input is **uncontrolled** — React never owns its value (#83) — and the playhead moves
 * with `transform` only, which is what keeps playback off the main thread.
 */
export function RoundTimeline({ demo, transport }: Props) {
  const t = useT();
  const locale = useLocale();

  // The only thing here read as text is the scrubber's `aria-valuetext`, so it moves at 10 Hz —
  // AGENTS.md §8. The playhead itself moves through the DOM on the frame channel, below.
  const frame = useFrameReadout(transport);

  const stripRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);

  const end = lastFrame(demo.track);
  const format = useMemo(() => createClockFormat(locale), [locale]);

  const markers = useMemo(() => killMarkers(demo), [demo]);
  const names = useMemo(() => namesBySlot(demo.header.players), [demo.header.players]);

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
      className="relative h-10 min-w-0 flex-1 has-[input:focus-visible]:rounded-card has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-focus"
    >
      {/* The axis the markers and the playhead are read against. `--line-soft` because it is an
          internal divider on a card rather than the card's own edge — DESIGN.md §2.1. */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-line-soft" />

      <div ref={playheadRef} className="absolute inset-y-0 left-0 w-px bg-playhead">
        {/* §7.1's glow, and shadowless the way §2.5 asks: a 3px accent bar behind a 1px white
            line, not a blur. The playhead stays the brightest thing on the screen. */}
        <span aria-hidden="true" className="-left-px absolute inset-y-0 w-[3px] bg-accent/40" />
      </div>

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
        className="absolute inset-0 size-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-10 [&::-moz-range-thumb]:w-px [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:w-px [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
      />

      <KillMarkers markers={markers} names={names} transport={transport} />
    </div>
  );
}
