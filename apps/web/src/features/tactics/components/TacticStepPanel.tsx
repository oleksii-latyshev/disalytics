import type { TacticStep } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ArrowLeft, ArrowRight, Clock, Copy, Plus, Trash2 } from 'lucide-react';

export interface TacticStepPanelProps {
  readonly steps: readonly TacticStep[];
  readonly activeStepIndex: number;
  readonly onSelectStep: (index: number) => void;
  readonly onAddStep: () => void;
  readonly onDuplicateStep: (index: number) => void;
  readonly onDeleteStep: (index: number) => void;
  readonly onMoveStep: (index: number, direction: 'earlier' | 'later') => void;
  readonly onUpdateName: (index: number, name: string) => void;
  readonly onUpdateOffset: (index: number, offset: number) => void;
  readonly onUpdateNotes: (index: number, notes: string) => void;
}

export function TacticStepPanel({
  steps,
  activeStepIndex,
  onSelectStep,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onMoveStep,
  onUpdateName,
  onUpdateOffset,
  onUpdateNotes,
}: TacticStepPanelProps) {
  const t = useT();
  const activeStep = steps[activeStepIndex] ?? steps[0];

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-1 p-3 text-ink">
      {/* Horizontal Step Timeline Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-dim">
          {t('library.tactics.steps.title')}
        </span>

        <div className="flex items-center gap-1.5">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelectStep(index)}
                className={`group flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border border-white/40 bg-surface-2 text-ink shadow-sm'
                    : 'border border-line/60 bg-surface-0 text-ink-dim hover:border-line hover:text-ink'
                }`}
              >
                <span className="font-mono text-[10px] text-ink-faint group-hover:text-ink-dim">
                  #{index + 1}
                </span>
                <span className="truncate max-w-[120px]">{step.name}</span>
                <span className="flex items-center gap-0.5 rounded-full bg-surface-3/50 px-1.5 py-0.5 font-mono text-[10px] text-ink-dim">
                  <Clock className="h-2.5 w-2.5" />+{step.timeOffsetSeconds}s
                </span>
              </button>
            );
          })}

          <Button
            variant="outline"
            onClick={onAddStep}
            className="flex shrink-0 items-center gap-1 rounded-full border-dashed border-line px-2.5 py-1 text-xs text-ink-dim hover:border-white/50 hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('library.tactics.steps.add')}</span>
          </Button>
        </div>
      </div>

      {/* Active Step Details & Actions */}
      {activeStep !== undefined && (
        <div className="flex flex-col gap-3 rounded-card border border-line/50 bg-surface-0/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ink-dim">
                {t('library.tactics.steps.step', { index: activeStepIndex + 1 })}
              </span>
              <input
                type="text"
                value={activeStep.name}
                onChange={(e) => onUpdateName(activeStepIndex, e.target.value)}
                aria-label={t('library.tactics.steps.name')}
                placeholder={t('library.tactics.steps.namePlaceholder')}
                className="rounded-chip border border-line bg-surface-1 px-2.5 py-1 text-xs font-medium text-ink placeholder:text-ink-faint focus:border-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              <label
                aria-label={t('library.tactics.steps.offset', {
                  seconds: activeStep.timeOffsetSeconds,
                })}
                title={t('library.tactics.steps.offset', { seconds: activeStep.timeOffsetSeconds })}
                className="flex items-center gap-1 font-mono text-xs text-ink-dim"
              >
                <Clock className="h-3.5 w-3.5" />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={activeStep.timeOffsetSeconds}
                  onChange={(e) => onUpdateOffset(activeStepIndex, Number(e.target.value))}
                  aria-label={t('library.tactics.steps.offset', {
                    seconds: activeStep.timeOffsetSeconds,
                  })}
                  className="w-16 rounded-chip border border-line bg-surface-1 px-1.5 py-0.5 text-center font-mono text-xs text-ink focus:border-white focus:outline-none"
                />
                <span>s</span>
              </label>

              <div className="ml-2 flex items-center gap-0.5 border-l border-line pl-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMoveStep(activeStepIndex, 'earlier')}
                  disabled={activeStepIndex === 0}
                  title={t('library.tactics.steps.moveEarlier')}
                  className="h-7 w-7 text-ink-dim hover:text-ink disabled:opacity-30"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMoveStep(activeStepIndex, 'later')}
                  disabled={activeStepIndex === steps.length - 1}
                  title={t('library.tactics.steps.moveLater')}
                  className="h-7 w-7 text-ink-dim hover:text-ink disabled:opacity-30"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDuplicateStep(activeStepIndex)}
                  title={t('library.tactics.steps.duplicate')}
                  className="h-7 w-7 text-ink-dim hover:text-ink"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteStep(activeStepIndex)}
                  disabled={steps.length <= 1}
                  title={
                    steps.length <= 1
                      ? t('library.tactics.steps.cannotDeleteLast')
                      : t('library.tactics.steps.delete')
                  }
                  className="h-7 w-7 text-damage/80 hover:bg-damage/20 hover:text-damage disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Step coaching notes */}
          <div>
            <textarea
              rows={2}
              value={activeStep.notes ?? ''}
              onChange={(e) => onUpdateNotes(activeStepIndex, e.target.value)}
              aria-label={t('library.tactics.steps.notes')}
              placeholder={t('library.tactics.steps.notesPlaceholder')}
              className="w-full resize-y rounded-chip border border-line bg-surface-1 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-white focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
