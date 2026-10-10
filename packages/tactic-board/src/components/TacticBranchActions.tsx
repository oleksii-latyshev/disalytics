import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { GitBranch, Skull } from 'lucide-react';

export interface TacticBranchActionsProps {
  readonly onBranch: () => void;
  /** The picked player who could die here, as a number from 1; null when none is picked or alive. */
  readonly diesSlot: number | null;
  readonly canDie: boolean;
  readonly onDies: () => void;
}

/** Under the step's fields: leave the plan after this step, on a condition or on a death. */
export function TacticBranchActions({
  onBranch,
  diesSlot,
  canDie,
  onDies,
}: TacticBranchActionsProps) {
  const t = useT();
  return (
    <section className="flex flex-col gap-2 px-3 pb-3">
      <Button
        variant="outline"
        onClick={onBranch}
        title={t('library.tactics.board.branch.fromStepTip')}
        className="justify-start"
      >
        <GitBranch aria-hidden="true" />
        {t('library.tactics.board.branch.fromStep')}
      </Button>
      {diesSlot !== null && (
        <>
          <Button
            variant="outline"
            disabled={!canDie}
            onClick={onDies}
            className="justify-start text-damage"
          >
            <Skull aria-hidden="true" />
            {t('library.tactics.board.branch.dies', { slot: diesSlot })}
          </Button>
          {!canDie && (
            <p className="text-11 text-ink-faint">{t('library.tactics.board.branch.diesFirst')}</p>
          )}
        </>
      )}
    </section>
  );
}
