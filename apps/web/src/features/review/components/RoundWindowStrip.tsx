import type { ParsedDemo } from '@disa/demo-core';
import { type RoundWindow, roundWindowBounds, type WindowEdge } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { formatClock, keyDirection, windowFraction } from '../helpers/window-strip';

interface Props {
  demo: ParsedDemo;
  roundIndex: number;
  window: RoundWindow;
  /** Seconds from the window start at which each step but the first begins. */
  cutSeconds: readonly number[];
  plantTick: number | null;
  onMove: (edge: WindowEdge, tick: number) => void;
}

const FINE_SECONDS = 1;
const COARSE_SECONDS = 5;

function Handle({
  edge,
  value,
  min,
  max,
  fraction,
  label,
  valueText,
  onKeyDown,
  onPointerDown,
  onPointerMove,
}: {
  edge: WindowEdge;
  value: number;
  min: number;
  max: number;
  fraction: number;
  label: string;
  valueText: string;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      data-edge={edge}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{ insetInlineStart: `${fraction * 100}%` }}
      className="absolute top-0 grid h-full w-4 -translate-x-1/2 cursor-ew-resize touch-none place-items-center outline-none"
    >
      <span className="h-full w-1 rounded-full bg-ink transition-[width] [div:focus-visible>&]:w-1.5" />
    </div>
  );
}

/**
 * The round from freeze end to its end, with the saved window lit and an edge at each end of it.
 * An edge moves with a drag or the arrow keys; the cuts between steps are only shown, because
 * steps are split and merged later, in the editor.
 */
export function RoundWindowStrip({
  demo,
  roundIndex,
  window,
  cutSeconds,
  plantTick,
  onMove,
}: Props) {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const bounds = roundWindowBounds(demo, roundIndex);
  if (bounds === undefined) return null;

  const { tickRate } = demo.header;
  const lengthTicks = Math.max(1, bounds.endTick - bounds.startTick);
  const secondsOf = (tick: number) => (tick - bounds.startTick) / tickRate;
  const start = windowFraction(bounds, window.startTick);
  const end = windowFraction(bounds, window.endTick);

  const tickAt = (event: PointerEvent<HTMLElement>): number | null => {
    const box = track.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return null;
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    return bounds.startTick + fraction * lengthTicks;
  };

  const dragOf = (edge: WindowEdge) => ({
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const tick = tickAt(event);
      if (tick !== null) onMove(edge, Math.round(tick));
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const direction = keyDirection(event.key);
      if (direction === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const seconds = event.shiftKey ? COARSE_SECONDS : FINE_SECONDS;
      const current = edge === 'start' ? window.startTick : window.endTick;
      onMove(edge, current + direction * seconds * tickRate);
    },
  });

  const lengthSeconds = lengthTicks / tickRate;

  return (
    <section
      aria-label={t('review.tactics.window.label')}
      className="flex flex-col gap-1.5 px-3 pb-3"
    >
      <div className="flex items-baseline justify-between gap-3 text-12 text-ink-dim">
        <span>{t('review.tactics.window.hint')}</span>
        <span className="numeric text-ink">
          {t('review.tactics.window.range', {
            from: formatClock(secondsOf(window.startTick)),
            to: formatClock(secondsOf(window.endTick)),
          })}
        </span>
      </div>

      <div ref={track} className="relative mx-2 h-9">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-3" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-ink/40"
          style={{ insetInlineStart: `${start * 100}%`, width: `${(end - start) * 100}%` }}
        />
        {cutSeconds.map((seconds) => {
          const fraction = windowFraction(bounds, window.startTick + seconds * tickRate);
          return (
            <span
              key={seconds}
              title={t('review.tactics.window.cut', {
                time: formatClock(secondsOf(window.startTick) + seconds),
              })}
              style={{ insetInlineStart: `${fraction * 100}%` }}
              className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-ink"
            />
          );
        })}
        {plantTick !== null && (
          <span
            title={t('review.tactics.window.plant', { time: formatClock(secondsOf(plantTick)) })}
            style={{ insetInlineStart: `${windowFraction(bounds, plantTick) * 100}%` }}
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-t"
          />
        )}
        <Handle
          edge="start"
          value={Math.round(secondsOf(window.startTick))}
          min={0}
          max={Math.round(lengthSeconds)}
          fraction={start}
          label={t('review.tactics.window.start')}
          valueText={formatClock(secondsOf(window.startTick))}
          {...dragOf('start')}
        />
        <Handle
          edge="end"
          value={Math.round(secondsOf(window.endTick))}
          min={0}
          max={Math.round(lengthSeconds)}
          fraction={end}
          label={t('review.tactics.window.end')}
          valueText={formatClock(secondsOf(window.endTick))}
          {...dragOf('end')}
        />
      </div>
    </section>
  );
}
