import type { TacticStep } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import {
  formatRoundClock,
  type StepSchedule,
  TACTIC_ROUND_SECONDS,
} from '../helpers/tactic-schedule';

export interface TacticStepSectionProps {
  readonly step: TacticStep;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly stepSchedule: StepSchedule | undefined;
  readonly deleteBlock: 'only-step' | 'fork-point' | 'missing' | null;
  readonly onRename: (name: string) => void;
  readonly onIdea: (idea: string) => void;
  readonly onStart: (startsAt: number | null) => void;
  readonly onDelete: () => void;
  readonly onCommit: () => void;
}

const FIELD =
  'w-full rounded-chip border border-line bg-surface-0 px-2.5 text-13 text-ink placeholder:text-ink-faint focus-visible:border-line-strong';

const SEGMENT = 'h-8 flex-1 rounded-chip px-2 text-12 transition-colors';

export function TacticStepSection({
  step,
  stepIndex,
  stepCount,
  stepSchedule,
  deleteBlock,
  onRename,
  onIdea,
  onStart,
  onDelete,
  onCommit,
}: TacticStepSectionProps) {
  const t = useT();
  const nameId = useId();
  const ideaId = useId();
  const isPinned = step.startsAt !== null;
  const clock = formatRoundClock(stepSchedule?.startSeconds ?? 0);

  const timingNote = !isPinned
    ? t('library.tactics.board.step.timingAfter')
    : stepSchedule?.isLate === true
      ? t('library.tactics.board.step.timingLate', { clock })
      : t('library.tactics.board.step.timingPinned', { clock });

  const deleteReason =
    deleteBlock === 'only-step'
      ? t('library.tactics.board.step.deleteOnly')
      : deleteBlock === 'fork-point'
        ? t('library.tactics.board.step.deleteFork')
        : undefined;

  return (
    <section
      className="flex flex-col gap-3 p-3"
      aria-label={t('library.tactics.board.step.eyebrow', {
        index: stepIndex + 1,
        total: stepCount,
      })}
    >
      <div className="flex items-baseline justify-between gap-2 font-mono text-11 uppercase tracking-[0.12em] text-ink-dim">
        <span>
          {t('library.tactics.board.step.eyebrow', { index: stepIndex + 1, total: stepCount })}
        </span>
        <span className="text-ink tabular-nums">{clock}</span>
      </div>

      <label htmlFor={nameId} className="flex flex-col gap-1 text-12 text-ink-dim">
        {t('library.tactics.board.step.name')}
        <input
          id={nameId}
          type="text"
          value={step.name}
          onChange={(event) => onRename(event.target.value)}
          onBlur={onCommit}
          placeholder={t('library.tactics.board.step.namePlaceholder')}
          className={cn(FIELD, 'h-9')}
        />
      </label>

      <label htmlFor={ideaId} className="flex flex-col gap-1 text-12 text-ink-dim">
        {t('library.tactics.board.step.idea')}
        <textarea
          id={ideaId}
          rows={3}
          value={step.idea ?? ''}
          onChange={(event) => onIdea(event.target.value)}
          onBlur={onCommit}
          placeholder={t('library.tactics.board.step.ideaPlaceholder')}
          className={cn(FIELD, 'resize-none py-2 leading-prose')}
        />
      </label>

      <div className="flex flex-col gap-2">
        <fieldset
          aria-label={t('library.tactics.board.step.startMode')}
          className="m-0 flex min-w-0 flex-1 gap-1 rounded-card border-none bg-surface-0 p-1"
        >
          <button
            type="button"
            aria-pressed={!isPinned}
            onClick={() => onStart(null)}
            className={cn(
              SEGMENT,
              !isPinned ? 'bg-surface-3 font-semibold text-ink' : 'text-ink-dim hover:bg-hover',
            )}
          >
            {t('library.tactics.board.step.afterPrevious')}
          </button>
          <button
            type="button"
            aria-pressed={isPinned}
            onClick={() =>
              onStart(isPinned ? step.startsAt : Math.ceil(stepSchedule?.startSeconds ?? 0))
            }
            className={cn(
              SEGMENT,
              isPinned ? 'bg-surface-3 font-semibold text-ink' : 'text-ink-dim hover:bg-hover',
            )}
          >
            {t('library.tactics.board.step.pinned')}
          </button>
        </fieldset>
        {isPinned && (
          <span className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={t('library.tactics.board.step.later')}
              onClick={() => onStart(Math.min(TACTIC_ROUND_SECONDS, (step.startsAt ?? 0) + 1))}
            >
              <Minus />
            </Button>
            <span className="min-w-10 text-center font-mono text-13 tabular-nums">{clock}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('library.tactics.board.step.earlier')}
              onClick={() => onStart(Math.max(0, (step.startsAt ?? 0) - 1))}
            >
              <Plus />
            </Button>
          </span>
        )}
      </div>

      <p
        className={cn(
          'text-12 leading-prose',
          stepSchedule?.isLate === true && isPinned ? 'text-damage' : 'text-ink-dim',
        )}
      >
        {timingNote}
      </p>

      <Button
        variant="outline"
        onClick={onDelete}
        disabled={deleteBlock !== null}
        title={deleteReason}
        className="self-start text-ink-dim hover:text-damage"
      >
        <Trash2 />
        {t('library.tactics.board.step.delete')}
      </Button>
      {deleteReason !== undefined && (
        <p className="-mt-1.5 text-11 text-ink-faint">{deleteReason}</p>
      )}
    </section>
  );
}
