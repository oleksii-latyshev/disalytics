import { useT } from '@disa/i18n';

interface Props {
  isShown: boolean;
  onToggle: (isShown: boolean) => void;
}

/** Whether the other team is drawn on the plate; saving keeps it either way. */
export function TacticOpponentsToggle({ isShown, onToggle }: Props) {
  const t = useT();

  return (
    <div className="flex min-w-0 gap-0.5 rounded-card bg-surface-1 p-0.5">
      <button
        type="button"
        aria-pressed={isShown}
        onClick={() => onToggle(!isShown)}
        className="h-8 rounded-chip px-2.5 text-12 text-ink-dim transition-colors hover:bg-hover aria-pressed:bg-surface-3 aria-pressed:text-ink"
      >
        {t('review.tactics.opponents.label')}
      </button>
    </div>
  );
}
