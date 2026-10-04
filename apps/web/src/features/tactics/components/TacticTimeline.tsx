import type { TacticSide, TacticStep } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { Pause, Play, Plus, SkipBack, SkipForward } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { UTILITY_INK } from '@/core/glyphs';
import { formatClock, stepSegments, throwMarkers } from '../helpers/tactic-timeline';

export interface TacticTimelineProps {
  readonly side: TacticSide;
  readonly steps: readonly TacticStep[];
  readonly activeStepIndex: number;
  readonly isPlaying: boolean;
  readonly playbackTime: number;
  readonly totalDuration: number;
  readonly playbackSpeed: number;
  readonly onSelectStep: (index: number) => void;
  readonly onAddStep: () => void;
  readonly onTogglePlay: () => void;
  readonly onSeek: (time: number) => void;
  readonly onJumpStep: (direction: 'prev' | 'next') => void;
  readonly onSpeedChange: (speed: number) => void;
}

const PLAYBACK_SPEEDS: readonly number[] = [0.5, 1, 2, 4];

function nextSpeed(current: number): number {
  const index = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length] ?? 1;
}

const SIDE_INK: Readonly<Record<TacticSide, string>> = { CT: 'text-ct', T: 'text-t' };
const SIDE_VAR: Readonly<Record<TacticSide, string>> = {
  CT: 'var(--color-ct)',
  T: 'var(--color-t)',
};

/** The side, the clock, the steps as chips and as segments of a track the playhead runs along. */
export function TacticTimeline({
  side,
  steps,
  activeStepIndex,
  isPlaying,
  playbackTime,
  totalDuration,
  playbackSpeed,
  onSelectStep,
  onAddStep,
  onTogglePlay,
  onSeek,
  onJumpStep,
  onSpeedChange,
}: TacticTimelineProps) {
  const t = useT();
  const segments = stepSegments(steps, totalDuration);
  const markers = throwMarkers(steps, totalDuration);
  const playheadPercent = totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0;
  const playLabel = isPlaying
    ? t('library.tactics.transport.pause')
    : t('library.tactics.transport.play');

  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number.parseFloat(event.target.value));
  };

  return (
    <div className="order-3 flex flex-col gap-1 bg-surface-1 lg:order-none lg:col-span-3 lg:row-start-3 lg:[border-block-start:1px_solid_var(--color-line)]">
      <div className="flex items-center gap-3 px-3 pt-2">
        <div className="flex shrink-0 items-baseline gap-2">
          <span className={cn('font-mono text-12 font-semibold', SIDE_INK[side])}>{side}</span>
          <span className="font-mono text-20 tabular-nums">{formatClock(playbackTime)}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const name = step.name.trim();
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelectStep(index)}
                aria-pressed={isActive}
                style={{ boxShadow: `inset 0 -2px 0 ${SIDE_VAR[side]}` }}
                className={cn(
                  'h-7 max-w-40 shrink-0 truncate rounded-chip px-2.5 font-mono text-12 font-medium transition-colors',
                  isActive ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink',
                )}
              >
                {name === '' ? index + 1 : `${index + 1} ${name}`}
              </button>
            );
          })}
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddStep}
            aria-label={t('library.tactics.steps.add')}
            title={t('library.tactics.steps.add')}
            className="size-7 text-ink-dim hover:text-ink"
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pt-1 pb-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onJumpStep('prev')}
          aria-label={t('library.tactics.transport.prevStep')}
          title={t('library.tactics.transport.prevStep')}
          className="hidden text-ink sm:inline-flex"
        >
          <SkipBack />
        </Button>
        <Button
          variant="primary"
          size="icon-lg"
          onClick={onTogglePlay}
          aria-label={playLabel}
          title={playLabel}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onJumpStep('next')}
          aria-label={t('library.tactics.transport.nextStep')}
          title={t('library.tactics.transport.nextStep')}
          className="hidden text-ink sm:inline-flex"
        >
          <SkipForward />
        </Button>
        <span className="hidden min-w-24 font-mono text-13 text-ink-dim tabular-nums md:inline">
          {t('library.tactics.transport.time', { current: playbackTime, total: totalDuration })}
        </span>

        <div className="relative h-10 min-w-0 flex-1">
          <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-line" />
          {segments.map((segment) => {
            const isActive = segment.index === activeStepIndex;
            return (
              <span
                key={segment.index}
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute inset-y-1 flex items-start overflow-hidden rounded-chip px-1.5 py-0.5 font-mono text-11 font-semibold',
                  SIDE_INK[side],
                  isActive ? 'bg-current/20' : 'bg-current/10',
                )}
                style={{
                  left: `${segment.startPercent}%`,
                  width: `${segment.widthPercent}%`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, currentColor ${isActive ? 55 : 20}%, transparent)`,
                }}
              >
                {segment.index + 1}
              </span>
            );
          })}
          {markers.map((marker) => (
            <span
              key={marker.id}
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute bottom-0.5 size-2 -translate-x-1/2 rounded-full bg-current',
                UTILITY_INK[marker.kind],
                playbackTime >= marker.seconds ? 'opacity-100' : 'opacity-45',
              )}
              style={{ left: `${marker.percent}%` }}
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${playheadPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={playbackTime}
            onChange={handleScrub}
            aria-label={t('library.tactics.transport.scrub')}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => onSpeedChange(nextSpeed(playbackSpeed))}
          aria-label={t('library.tactics.transport.speed')}
          title={t('library.tactics.transport.speed')}
          className="h-7 px-2 font-mono text-12 sm:hidden"
        >
          {playbackSpeed}×
        </Button>

        <fieldset
          aria-label={t('library.tactics.transport.speeds')}
          className="m-0 hidden items-center gap-1 border-none p-0 sm:flex"
        >
          {PLAYBACK_SPEEDS.map((speed) => (
            <Button
              key={speed}
              variant={speed === playbackSpeed ? 'secondary' : 'ghost'}
              onClick={() => onSpeedChange(speed)}
              aria-pressed={speed === playbackSpeed}
              className={cn(
                'h-7 px-2 font-mono text-12',
                speed === playbackSpeed ? 'text-ink' : 'text-ink-dim',
              )}
            >
              {speed}×
            </Button>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
