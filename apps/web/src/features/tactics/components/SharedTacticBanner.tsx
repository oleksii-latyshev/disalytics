import type { Tactic } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Share2, X } from 'lucide-react';
import { nameOrFallback } from '../helpers/tactic-names';

interface SharedTacticBannerProps {
  readonly tactic: Tactic;
  readonly onSave: () => void;
  readonly onOpen: () => void;
  readonly onDismiss?: (() => void) | undefined;
}

export function SharedTacticBanner({ tactic, onSave, onOpen, onDismiss }: SharedTacticBannerProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/20 bg-surface-2 p-4 text-ink shadow-float">
      <div className="flex items-center gap-2.5">
        <Share2 className="h-5 w-5 text-ink-dim" />
        <div className="flex flex-col">
          <span className="text-14 font-medium">
            {t('library.tactics.library.sharedBanner', {
              title: nameOrFallback(tactic.title, t('library.tactics.untitled')),
            })}
          </span>
          <span className="font-mono text-12 text-ink-dim">
            {tactic.map} · {tactic.side}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onSave}>
          <Text path="library.tactics.library.saveToLibrary" />
        </Button>
        <Button variant="secondary" onClick={onOpen}>
          <Text path="library.tactics.library.openWithoutSaving" />
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label={t('library.tactics.library.dismiss')}
            className="text-ink-dim hover:text-ink"
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
