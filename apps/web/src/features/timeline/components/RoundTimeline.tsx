import {
  type ParsedDemo,
  type PlayerSlot,
  roundIndexAtFrame,
  secondsAtFrame,
} from '@disa/demo-core';
import { useLocale, useT } from '@disa/i18n';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createClockFormat,
  formatClock,
  type Transport,
  useFrameReadout,
  useFrameSink,
} from '@/core/playback';
import { filterGlyphs } from '../helpers/axis-filter';
import { axisGlyphs, positionInSegment, timelineSegment } from '../helpers/round-axis';
import { namesBySlot } from '../helpers/spine';
import { useAxisFilter } from '../hooks/use-axis-filter';
import { EventGlyphs } from './EventGlyphs';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
}

/**
 * The strip between play/pause and the speed control, scoped to one round. The buy phase is a region
 * of its own, the round's events are glyphs on the axis, and the scrubber under them spans the round
 * rather than the match.
 *
 * The range input is **uncontrolled** — React never owns its value (#83) — and the playhead moves
 * with `transform` only, which is what keeps playback off the main thread.
 *
 * **What the axis draws is the reader's choice**, through `AxisFilters` in the row above: the glyphs
 * are filtered before their hit slots are measured, so a round thinned by hand comes back with its
 * symbols rather than with the ticks #271 collapses a crowd to.
 */
export function RoundTimeline({ demo, transport, selectedSlot }: Props) {
  const t = useT();
  const locale = useLocale();

  // Which round the axis shows is text-rate information: it turns over once a round, so it rides the
  // readout rather than the clock — AGENTS.md §8. The playhead itself moves through the DOM on the
  // frame channel, below.
  const frame = useFrameReadout(transport);
  const roundIndex = roundIndexAtFrame(demo, frame);

  const stripRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);

  // A resize decides whether the glyphs are symbols or marks and how wide each one's target is, so
  // unlike the width the frame sink reads it has to reach React. It changes on a resize and nowhere
  // else.
  const [widthPx, setWidthPx] = useState(0);

  const format = useMemo(() => createClockFormat(locale), [locale]);
  const segment = useMemo(() => timelineSegment(demo, roundIndex), [demo, roundIndex]);
  const glyphs = useMemo(() => axisGlyphs(demo, roundIndex, segment), [demo, roundIndex, segment]);
  const names = useMemo(() => namesBySlot(demo.header.players), [demo.header.players]);

  // The filter runs here rather than inside `EventGlyphs`, and before the hit slots are measured:
  // a slot is half the way to the nearest *drawn* mark, so taking a facet away is what widens the
  // survivors and hands them back the symbols #271 collapsed. Deriving it once per round keeps it
  // off the readout the way `axisGlyphs` is kept off it.
  const filter = useAxisFilter(selectedSlot);
  const shown = useMemo(() => filterGlyphs(glyphs, filter), [glyphs, filter]);

  const syncPlayhead = useCallback(() => {
    const playhead = playheadRef.current;
    if (playhead === null) return;

    const offsetPx = positionInSegment(transport.clock.frame, segment, widthRef.current);
    playhead.style.transform = `translateX(${offsetPx}px)`;

    const input = inputRef.current;
    if (input === null || isScrubbingRef.current) return;

    // Clamped into the round the input now spans, or the clock running a readout ahead of the axis
    // would leave the comparison permanently false and write a string on every frame.
    const sample = Math.min(
      Math.max(Math.round(transport.clock.frame), segment.startFrame),
      segment.endFrame,
    );
    if (input.valueAsNumber !== sample) input.value = String(sample);
  }, [transport, segment]);

  useFrameSink(transport, syncPlayhead);

  // The round turning over rewrites the range's bounds, and an uncontrolled input keeps the value it
  // had until something writes a new one — which, while playback is paused, nothing else would.
  useEffect(syncPlayhead, [syncPlayhead]);

  useEffect(() => {
    const strip = stripRef.current;
    if (strip === null) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry === undefined) return;

      widthRef.current = entry.contentRect.width;
      setWidthPx(entry.contentRect.width);
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

  const positionLabel =
    segment.roundNumber === null
      ? t('timeline.positionInWarmup')
      : t('timeline.positionInRound', { round: segment.roundNumber });

  return (
    <div
      ref={stripRef}
      className="relative h-10 min-w-0 flex-1 has-[input:focus-visible]:rounded-card has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-focus"
    >
      {/* The buy phase: a region rather than a mark, because it is a stretch of the round in which
          nothing the axis draws can happen. */}
      {segment.buyEndFraction !== null && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-surface-2"
          style={{ width: `${segment.buyEndFraction * 100}%` }}
        />
      )}

      {/* The axis the glyphs and the playhead are read against. `--line-soft` because it is an
          internal divider on a card rather than the card's own edge. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-line-soft" />

      {segment.buyEndFraction !== null && (
        <div
          aria-hidden="true"
          className="absolute inset-y-2 w-px bg-line"
          style={{ left: `${segment.buyEndFraction * 100}%` }}
        />
      )}

      {/* Where the round was won. The axis runs past it into the seconds before the next buy, so
          without this hairline the tail would read as round that never ended. */}
      {segment.closeFraction !== null && segment.closeFraction < 1 && (
        <div
          aria-hidden="true"
          className="absolute inset-y-2 w-px bg-line"
          style={{ left: `${segment.closeFraction * 100}%` }}
        />
      )}

      <div ref={playheadRef} className="absolute inset-y-0 left-0 w-px bg-playhead">
        {/* The playhead's glow, and shadowless: a 3px bar of dimmed white behind a 1px white
            line, not a blur. The playhead stays the brightest thing on the screen. */}
        <span aria-hidden="true" className="-left-px absolute inset-y-0 w-[3px] bg-ink/25" />
      </div>

      <input
        ref={inputRef}
        type="range"
        min={segment.startFrame}
        max={segment.endFrame}
        step={1}
        defaultValue={transport.clock.frame}
        aria-label={positionLabel}
        aria-valuetext={formatClock(format, secondsAtFrame(demo.track, frame))}
        onPointerDown={handlePointerDown}
        onInput={handleInput}
        className="absolute inset-0 size-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-10 [&::-moz-range-thumb]:w-px [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:w-px [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
      />

      <EventGlyphs
        glyphs={shown}
        names={names}
        selectedSlot={selectedSlot}
        widthPx={widthPx}
        transport={transport}
      />
    </div>
  );
}
