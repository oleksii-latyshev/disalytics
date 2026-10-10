import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { GitBranch } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export interface TacticBranchPanelProps {
  /** Effective index of the step the branch leaves after, as a number from 1. */
  readonly forkNumber: number;
  readonly condition: string;
  readonly parentName: string;
  readonly shouldFocus: boolean;
  /** The owner of the step in view when it is not this branch's own. */
  readonly sharedOwnerName: string | null;
  readonly onCondition: (condition: string) => void;
  readonly onCommit: () => void;
  readonly onFocused: () => void;
}

/** The right column's header on a branch: what it leaves from, the condition, and what is shared. */
export function TacticBranchPanel({
  forkNumber,
  condition,
  parentName,
  shouldFocus,
  sharedOwnerName,
  onCondition,
  onCommit,
  onFocused,
}: TacticBranchPanelProps) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shouldFocus) return;
    input.current?.focus();
    onFocused();
  }, [shouldFocus, onFocused]);

  return (
    <section className="flex flex-col gap-2 p-3 [border-block-end:1px_solid_var(--color-line)]">
      <span className="flex items-center gap-1.5 font-mono text-11 text-ink-dim uppercase tracking-[0.12em]">
        <GitBranch aria-hidden="true" className="size-3.5" />
        {t('library.tactics.board.branch.eyebrow', { index: forkNumber })}
      </span>
      <label htmlFor={id} className="sr-only">
        {t('library.tactics.board.branch.condition')}
      </label>
      <input
        id={id}
        ref={input}
        type="text"
        value={condition}
        onChange={(event) => onCondition(event.target.value)}
        onBlur={onCommit}
        placeholder={t('library.tactics.board.branch.conditionPlaceholder')}
        className="h-9 w-full rounded-chip border border-line bg-surface-0 px-2.5 font-semibold text-14 text-ink placeholder:font-normal placeholder:text-ink-faint focus-visible:border-line-strong"
      />
      <p className="text-12 text-ink-dim leading-prose">
        {t('library.tactics.board.branch.sharedNote', { parent: parentName })}
      </p>
      {sharedOwnerName !== null && (
        <p className={cn('rounded-chip bg-surface-2 px-2.5 py-1.5 text-12 leading-prose')}>
          {t('library.tactics.board.branch.sharedStep', { owner: sharedOwnerName })}
        </p>
      )}
    </section>
  );
}
