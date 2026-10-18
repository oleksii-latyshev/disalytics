import type { TacticStep } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { formatElapsed } from '../helpers/tactic-preview';
import type { TacticSchedule } from '../helpers/tactic-schedule';

export interface TacticStepTabsProps {
  readonly steps: readonly TacticStep[];
  readonly schedule: TacticSchedule;
  readonly stepIndex: number;
  readonly onSelect: (index: number) => void;
}

/** The steps of a tactic as a row to pick from, each with the time it starts. Nothing in it edits. */
export function TacticStepTabs({ steps, schedule, stepIndex, onSelect }: TacticStepTabsProps) {
  const t = useT();

  return (
    <ul
      aria-label={t('library.tactics.preview.steps')}
      className="m-0 flex list-none gap-1.5 overflow-x-auto px-3 py-2"
    >
      {steps.map((step, index) => (
        <li key={step.id} className="shrink-0">
          <button
            type="button"
            aria-pressed={index === stepIndex}
            onClick={() => onSelect(index)}
            className={cn(
              'flex min-w-24 flex-col gap-0.5 rounded-card border p-2 text-left transition-colors',
              index === stepIndex
                ? 'border-line-strong bg-surface-2'
                : 'border-line bg-surface-1 hover:bg-hover',
            )}
          >
            <span className="font-mono text-11 text-ink-dim tabular-nums">
              {index + 1} · {formatElapsed(schedule.steps[index]?.startSeconds ?? 0)}
            </span>
            <span className="truncate text-13 font-semibold">{step.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
