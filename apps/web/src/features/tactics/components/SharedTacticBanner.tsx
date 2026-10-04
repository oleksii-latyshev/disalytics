import type { Tactic } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { X } from 'lucide-react';
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
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-card border border-line-strong bg-surface-1 px-4 py-3 text-ink">
      <span aria-hidden className="size-2 flex-none rounded-full bg-ink" />
      <p className="min-w-0 flex-1 basis-60 text-14">
        <Text
          path="library.tactics.library.sharedBanner"
          values={{
            title: nameOrFallback(tactic.title, t('library.tactics.untitled')),
            map: tactic.map,
            side: tactic.side,
            steps: tactic.steps.length,
          }}
        />
      </p>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onSave}>
          <Text path="library.tactics.library.saveToPlaybook" />
        </Button>
        <Button variant="secondary" onClick={onOpen}>
          <Text path="library.tactics.library.preview" />
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
