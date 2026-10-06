import { mainSteps, type Tactic, tacticLoadout } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Copy, Download, Trash2 } from 'lucide-react';
import { computeTotalDuration } from '../helpers/editor-actions';
import { toEditorTactic } from '../helpers/editor-tactic';
import { nameOrFallback } from '../helpers/tactic-names';
import { GrenadeTally } from './GrenadeTally';
import { TacticThumbnail } from './TacticThumbnail';

export interface TacticCardProps {
  readonly tactic: Tactic;
  readonly onOpen: (tactic: Tactic) => void;
  readonly onDuplicate: (tactic: Tactic) => void;
  readonly onExport: (tactic: Tactic) => void;
  readonly onDelete: (id: string) => void;
}

const CHIP = 'rounded-chip bg-surface-2 px-2 py-0.5 font-mono text-11 text-ink-dim tabular-nums';

export function TacticCard({ tactic, onOpen, onDuplicate, onExport, onDelete }: TacticCardProps) {
  const t = useT();

  const totalDuration = computeTotalDuration(toEditorTactic(tactic).steps);
  const loadout = tacticLoadout(tactic);
  const rounds = tactic.rounds ?? [];
  const title = nameOrFallback(tactic.title, t('library.tactics.untitled'));

  const handleDelete = () => {
    if (window.confirm(t('library.tactics.library.deleteConfirm'))) {
      onDelete(tactic.id);
    }
  };

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface-1 p-3.5 transition-colors hover:border-line-strong sm:p-4">
      <button
        type="button"
        onClick={() => onOpen(tactic)}
        aria-label={t('library.tactics.library.openTactic', { title })}
        className="flex min-w-0 flex-1 cursor-pointer gap-3 text-start sm:gap-4"
      >
        <TacticThumbnail tactic={tactic} />
        <span className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
          <span className="flex items-center gap-2">
            <span
              className={`rounded-chip px-1.5 font-mono text-11 font-semibold ${
                tactic.side === 'CT' ? 'bg-ct/12 text-ct' : 'bg-t/12 text-t'
              }`}
            >
              {tactic.side}
            </span>
            <span className="truncate font-mono text-12 text-ink-faint">{tactic.map}</span>
          </span>
          <span className="line-clamp-2 font-ui text-16 font-semibold text-ink leading-dense sm:text-20">
            {title}
          </span>
          {tactic.description !== undefined && tactic.description.length > 0 && (
            <span className="line-clamp-2 text-13 text-ink-dim leading-prose">
              {tactic.description}
            </span>
          )}
          <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <span className={CHIP}>
              {t('library.tactics.library.stepsDuration', {
                count: mainSteps(tactic).length,
                seconds: totalDuration,
              })}
            </span>
            {loadout.teamTotal > 0 && (
              <span className={CHIP}>
                {t('library.tactics.library.throwsCost', {
                  count: loadout.teamTotal,
                  amount: loadout.teamCost,
                })}
              </span>
            )}
            <span className={CHIP}>
              {rounds.length === 0 ? t('library.tactics.library.anyRound') : rounds.join(' · ')}
            </span>
          </span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 [border-block-start:1px_solid_var(--color-line)] pt-2.5">
        {loadout.teamTotal > 0 ? <GrenadeTally counts={loadout.teamCounts} /> : <span />}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(tactic)}
            title={t('library.tactics.library.duplicate')}
            aria-label={t('library.tactics.library.duplicate')}
            className="text-ink-dim hover:text-ink"
          >
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExport(tactic)}
            title={t('library.tactics.library.exportOne')}
            aria-label={t('library.tactics.library.exportOne')}
            className="text-ink-dim hover:text-ink"
          >
            <Download />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title={t('library.tactics.library.delete')}
            aria-label={t('library.tactics.library.delete')}
            className="text-ink-dim hover:text-damage"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  );
}
