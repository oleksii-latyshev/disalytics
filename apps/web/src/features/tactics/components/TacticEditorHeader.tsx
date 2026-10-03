import type { Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ArrowLeft, Check, HelpCircle, Save } from 'lucide-react';

interface TacticEditorHeaderProps {
  readonly tactic: Tactic;
  readonly isSaved: boolean;
  readonly onBack?: (() => void) | undefined;
  readonly onUpdateTitle: (title: string) => void;
  readonly onUpdateDescription: (description: string) => void;
  readonly onSave: () => void;
}

export function TacticEditorHeader({
  tactic,
  isSaved,
  onBack,
  onUpdateTitle,
  onUpdateDescription,
  onSave,
}: TacticEditorHeaderProps) {
  const t = useT();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
      <div className="flex items-center gap-3">
        {onBack !== undefined && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            title={t('library.tactics.editor.exit')}
            aria-label={t('library.tactics.editor.exit')}
            className="h-8 w-8 text-ink-dim hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-dim" title={t('library.tactics.note')}>
            {t('library.tactics.title')}
          </span>
          <span className="text-ink-faint">/</span>
          <input
            type="text"
            value={tactic.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            aria-label={t('library.tactics.editor.tacticTitle')}
            placeholder={t('library.tactics.editor.tacticTitle')}
            className="rounded-chip border border-transparent bg-transparent px-2 py-0.5 text-sm font-semibold text-ink transition-colors hover:border-line focus:border-white focus:bg-surface-1 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full border border-line bg-surface-1 px-2.5 py-0.5 font-mono text-[11px] text-ink-dim"
            title={t('library.tactics.editor.map')}
          >
            {tactic.map}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
              tactic.side === 'CT' ? 'border-ct/40 bg-ct/10 text-ct' : 'border-t/40 bg-t/10 text-t'
            }`}
            title={t('library.tactics.editor.side')}
          >
            {tactic.side}
          </span>
          {tactic.author !== undefined && tactic.author.length > 0 && (
            <span
              className="font-mono text-[11px] text-ink-faint"
              title={t('library.tactics.editor.author')}
            >
              {tactic.author}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={tactic.description ?? ''}
          onChange={(e) => onUpdateDescription(e.target.value)}
          aria-label={t('library.tactics.editor.description')}
          placeholder={t('library.tactics.editor.descriptionPlaceholder')}
          className="w-48 rounded-chip border border-line/60 bg-surface-1 px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-white focus:outline-none"
        />

        <span
          className="cursor-help text-ink-faint hover:text-ink-dim"
          title={t('library.tactics.note')}
        >
          <HelpCircle className="h-4 w-4" />
        </span>

        <Button
          variant={isSaved ? 'outline' : 'primary'}
          onClick={onSave}
          aria-label={
            isSaved ? t('library.tactics.editor.saved') : t('library.tactics.editor.save')
          }
          className="h-8 gap-1.5 px-3 text-xs"
        >
          {isSaved ? (
            <>
              <Check className="h-3.5 w-3.5 text-ink" />
              <span className="text-ink">{t('library.tactics.editor.saved')}</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>{t('library.tactics.editor.save')}</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
