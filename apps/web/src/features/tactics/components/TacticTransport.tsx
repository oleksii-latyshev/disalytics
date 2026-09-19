import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { ChangeEvent } from 'react';

export interface TacticTransportProps {
  readonly isPlaying: boolean;
  readonly playbackTime: number;
  readonly totalDuration: number;
  readonly playbackSpeed: number;
  readonly stepOffsets: readonly number[];
  readonly onTogglePlay: () => void;
  readonly onSeek: (time: number) => void;
  readonly onJumpStep: (direction: 'prev' | 'next') => void;
  readonly onSpeedChange: (speed: number) => void;
}

const PLAYBACK_SPEEDS = [0.5, 1, 2] as const;

export function TacticTransport({
  isPlaying,
  playbackTime,
  totalDuration,
  playbackSpeed,
  stepOffsets,
  onTogglePlay,
  onSeek,
  onJumpStep,
  onSpeedChange,
}: TacticTransportProps) {
  const t = useT();

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number.parseFloat(event.target.value));
  };

  const handleCycleSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed as 0.5 | 1 | 2);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const nextSpeed = PLAYBACK_SPEEDS[nextIndex];
    if (nextSpeed !== undefined) {
      onSpeedChange(nextSpeed);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface-1 px-4 py-2.5 text-ink">
      {/* Play/Pause & Step Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onJumpStep('prev')}
          aria-label={t('library.tactics.transport.prevStep')}
          title={t('library.tactics.transport.prevStep')}
          className="h-8 w-8 text-ink-dim hover:text-ink"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={onTogglePlay}
          aria-label={
            isPlaying ? t('library.tactics.transport.pause') : t('library.tactics.transport.play')
          }
          title={
            isPlaying ? t('library.tactics.transport.pause') : t('library.tactics.transport.play')
          }
          className="h-9 w-9 text-ink"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onJumpStep('next')}
          aria-label={t('library.tactics.transport.nextStep')}
          title={t('library.tactics.transport.nextStep')}
          className="h-8 w-8 text-ink-dim hover:text-ink"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress Slider & Step Markers */}
      <div className="relative flex flex-1 items-center">
        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.1}
          value={playbackTime}
          onChange={handleSliderChange}
          aria-label={t('library.tactics.transport.scrub')}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-white focus:outline-none focus:ring-1 focus:ring-white"
        />

        {/* Step ticks along the slider */}
        {totalDuration > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {stepOffsets.map((offset) => {
              const leftPercent = Math.min(100, Math.max(0, (offset / totalDuration) * 100));
              return (
                <div
                  key={offset}
                  className="absolute h-3 w-1 -translate-x-1/2 rounded-full bg-line"
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Time display & Speed toggle */}
      <div className="flex items-center gap-3 font-mono text-xs text-ink-dim">
        <span className="tabular-nums">
          {t('library.tactics.transport.time', {
            current: playbackTime,
            total: totalDuration,
          })}
        </span>

        <Button
          variant="outline"
          onClick={handleCycleSpeed}
          aria-label={t('library.tactics.transport.speed')}
          title={t('library.tactics.transport.speed')}
          className="h-7 px-2 font-mono text-xs font-medium text-ink"
        >
          {playbackSpeed}×
        </Button>
      </div>
    </div>
  );
}
