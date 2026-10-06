import type { TacticStep } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { Plus } from 'lucide-react';
import { formatRoundClock, type StepSchedule } from '../helpers/tactic-schedule';

/** One row of the strip: a plan's own steps. Branches add rows below the root's. */
export interface PlanLane {
  readonly planId: string;
  /** Index in the plan's effective steps of the first card this lane shows. */
  readonly firstIndex: number;
  readonly steps: readonly TacticStep[];
  readonly schedule: readonly (StepSchedule | undefined)[];
}

export interface TacticPlanStripProps {
  readonly lanes: readonly PlanLane[];
  readonly currentPlanId: string;
  readonly stepIndex: number;
  readonly onSelect: (planId: string, index: number) => void;
  readonly onAddStep: (planId: string) => void;
}

export function TacticPlanStrip({
  lanes,
  currentPlanId,
  stepIndex,
  onSelect,
  onAddStep,
}: TacticPlanStripProps) {
  const t = useT();

  return (
    <fieldset
      aria-label={t('library.tactics.board.strip.label')}
      className="m-0 flex min-w-0 flex-col gap-2 overflow-x-auto border-none px-3 pt-1 pb-3"
    >
      {lanes.map((lane) => (
        <ol key={lane.planId} className="flex min-w-max items-stretch gap-2">
          {lane.steps.map((step, offset) => {
            const index = lane.firstIndex + offset;
            const isCurrent = lane.planId === currentPlanId && index === stepIndex;
            const name =
              step.name.trim() || t('library.tactics.board.strip.unnamed', { index: index + 1 });
            return (
              <li key={step.id}>
                <button
                  type="button"
                  aria-pressed={isCurrent}
                  title={name}
                  aria-label={t('library.tactics.board.strip.card', { index: index + 1, name })}
                  onClick={() => onSelect(lane.planId, index)}
                  className={cn(
                    'flex h-full w-44 flex-col gap-1 rounded-card border p-2.5 text-left transition-colors',
                    isCurrent
                      ? 'border-ink bg-surface-2'
                      : 'border-line bg-surface-1 hover:bg-hover',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-3 font-mono text-11">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-13 font-semibold">{name}</span>
                    <span
                      className={cn(
                        'font-mono text-11 tabular-nums',
                        step.startsAt === null ? 'text-ink-dim' : 'font-semibold text-ink',
                      )}
                    >
                      {formatRoundClock(lane.schedule[offset]?.startSeconds ?? 0)}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-12 text-ink-dim leading-dense">
                    {step.idea?.trim() || t('library.tactics.board.strip.noIdea')}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => onAddStep(lane.planId)}
              className="flex h-full min-h-16 items-center gap-1.5 rounded-card border border-dashed border-line-strong px-3 text-13 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
              aria-label={t('library.tactics.board.strip.addStep')}
            >
              <Plus className="size-4" />
              {t('library.tactics.board.step.add')}
            </button>
          </li>
        </ol>
      ))}
    </fieldset>
  );
}
