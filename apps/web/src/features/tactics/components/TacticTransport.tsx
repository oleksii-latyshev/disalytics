import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { Clock, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { TACTIC_SPEEDS } from '../helpers/tactic-clock';
import { formatRoundClock } from '../helpers/tactic-schedule';

export interface TacticTransportProps {
  readonly isPlaying: boolean;
  readonly speed: number;
  /** Seconds on the plan's clock, refreshed at 10 Hz while playing. */
  readonly seconds: number;
  readonly canPrev: boolean;
  readonly canNext: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onToggle: () => void;
  readonly onSpeed: (speed: number) => void;
}

const ROUND_BUTTON =
  'grid size-9 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-hover disabled:opacity-40';

export function TacticTransport({
  isPlaying,
  speed,
  seconds,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onToggle,
  onSpeed,
}: TacticTransportProps) {
  const t = useT();

  return (
    <fieldset
      aria-label={t('library.tactics.board.transport.label')}
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-none px-3 py-2"
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={t('library.tactics.board.transport.prev')}
        className={ROUND_BUTTON}
      >
        <SkipBack className="size-4" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          isPlaying
            ? t('library.tactics.board.transport.pause')
            : t('library.tactics.board.transport.play')
        }
        className="grid size-10 place-items-center rounded-full bg-ink text-surface-0 transition-opacity hover:opacity-90"
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label={t('library.tactics.board.transport.next')}
        className={ROUND_BUTTON}
      >
        <SkipForward className="size-4" />
      </button>

      <span
        className="ml-2 flex items-center gap-1.5 font-mono text-16 tabular-nums"
        title={t('library.tactics.board.transport.clock')}
      >
        <Clock aria-hidden="true" className="size-3.5 text-ink-dim" />
        <span>{formatRoundClock(seconds)}</span>
      </span>
      <span className="text-12 text-ink-dim">{t('library.tactics.board.transport.hint')}</span>

      <fieldset
        aria-label={t('library.tactics.board.transport.speed')}
        className="m-0 ml-auto flex min-w-0 gap-0.5 rounded-card border-none bg-surface-0 p-0.5"
      >
        {TACTIC_SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={speed === option}
            onClick={() => onSpeed(option)}
            className={cn(
              'h-7 min-w-9 rounded-chip px-2 font-mono text-12 transition-colors',
              speed === option ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-hover',
            )}
          >
            {t('library.tactics.board.transport.speedValue', { speed: option })}
          </button>
        ))}
      </fieldset>
    </fieldset>
  );
}
