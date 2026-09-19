import type { Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Bomb, Clock, Copy, Download, Layers, Link2, Play, Trash2 } from 'lucide-react';
import { computeTotalDuration } from '../helpers/editor-actions';

export interface TacticCardProps {
  readonly tactic: Tactic;
  readonly onOpen: (tactic: Tactic) => void;
  readonly onShare: (tactic: Tactic) => void;
  readonly onDuplicate: (tactic: Tactic) => void;
  readonly onExport: (tactic: Tactic) => void;
  readonly onDelete: (id: string) => void;
}

export function TacticCard({
  tactic,
  onOpen,
  onShare,
  onDuplicate,
  onExport,
  onDelete,
}: TacticCardProps) {
  const t = useT();

  const totalDuration = computeTotalDuration(tactic.steps);
  const totalThrows = tactic.steps.reduce((acc, step) => acc + step.throws.length, 0);

  const handleDelete = () => {
    if (window.confirm(t('library.tactics.library.deleteConfirm'))) {
      onDelete(tactic.id);
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-card border border-line bg-surface-1 p-4 transition-colors hover:border-white/20">
      <div className="flex flex-col gap-2.5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded-full border border-line bg-surface-0 px-2.5 py-0.5 font-mono text-[11px] text-ink-dim"
              title={tactic.map}
            >
              {tactic.map}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                tactic.side === 'CT'
                  ? 'border-ct/40 bg-ct/10 text-ct'
                  : 'border-t/40 bg-t/10 text-t'
              }`}
              title={tactic.side}
            >
              {tactic.side}
            </span>
          </div>

          {tactic.author !== undefined && tactic.author.length > 0 && (
            <span
              className="truncate font-mono text-[11px] text-ink-faint max-w-[120px]"
              title={tactic.author}
            >
              {tactic.author}
            </span>
          )}
        </div>

        {/* Title and description */}
        <div className="flex flex-col gap-1">
          <h3 className="truncate font-ui text-16 font-semibold text-ink leading-dense">
            {tactic.title}
          </h3>
          {tactic.description !== undefined && tactic.description.length > 0 ? (
            <p className="line-clamp-2 text-13 text-ink-dim leading-prose">{tactic.description}</p>
          ) : (
            <p className="text-13 text-ink-faint italic leading-prose">
              {tactic.map} {tactic.side} strategy
            </p>
          )}
        </div>

        {/* Tactical statistics pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-11 text-ink-dim">
          <span className="flex items-center gap-1 rounded-chip bg-surface-2 px-2 py-0.5">
            <Layers className="h-3 w-3 text-ink-faint" />
            {t('library.tactics.library.stepsCount', {
              count: tactic.steps.length,
            })}
          </span>

          {totalThrows > 0 && (
            <span className="flex items-center gap-1 rounded-chip bg-surface-2 px-2 py-0.5">
              <Bomb className="h-3 w-3 text-ink-faint" />
              {t('library.tactics.library.throwsCount', { count: totalThrows })}
            </span>
          )}

          <span className="flex items-center gap-1 rounded-chip bg-surface-2 px-2 py-0.5">
            <Clock className="h-3 w-3 text-ink-faint" />
            {t('library.tactics.library.duration', { seconds: totalDuration })}
          </span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between gap-2 [border-block-start:1px_solid_var(--color-line)] pt-3 mt-4">
        <Button
          variant="secondary"
          onClick={() => onOpen(tactic)}
          className="h-8 gap-1.5 px-3 text-xs"
        >
          <Play className="h-3.5 w-3.5" />
          <span>{t('library.tactics.library.openWithoutSaving')}</span>
        </Button>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare(tactic)}
            title={t('library.tactics.library.share')}
            aria-label={t('library.tactics.library.share')}
            className="h-8 w-8 text-ink-dim hover:text-ink"
          >
            <Link2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(tactic)}
            title={t('library.tactics.library.duplicate')}
            aria-label={t('library.tactics.library.duplicate')}
            className="h-8 w-8 text-ink-dim hover:text-ink"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExport(tactic)}
            title={t('library.tactics.library.exportOne')}
            aria-label={t('library.tactics.library.exportOne')}
            className="h-8 w-8 text-ink-dim hover:text-ink"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title={t('library.tactics.library.delete')}
            aria-label={t('library.tactics.library.delete')}
            className="h-8 w-8 text-ink-dim hover:text-damage"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
