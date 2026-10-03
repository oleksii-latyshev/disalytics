import type { Lineup } from '@disa/demo-core';
import { UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Dialog } from '@disa/ui';
import { X } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import type { SelectedVariants } from '../hooks/use-lineup-selection';
import { LineupPhoto } from './LineupPhoto';

export function LineupVariantsDialog({
  selectedVariants,
  selectedGroup,
  onDismiss,
  onSelectLineup,
}: {
  readonly selectedVariants: SelectedVariants | null;
  readonly selectedGroup: readonly Lineup[];
  readonly onDismiss: () => void;
  readonly onSelectLineup: (lineup: Lineup) => void;
}) {
  const t = useT();
  if (selectedVariants === null) return null;

  return (
    <Dialog isOpen onDismiss={onDismiss} className="w-full max-w-[36rem] p-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="font-ui text-16 font-medium text-ink">
          {selectedVariants.type === 'origin' ? (
            <Text path="library.lineups.fromPosition" values={{ count: selectedGroup.length }} />
          ) : (
            <Text path="library.lineups.toPosition" values={{ count: selectedGroup.length }} />
          )}
        </h3>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.close')}
          className="rounded-chip p-1 text-ink-dim hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto">
        {selectedGroup.map((lineup) => {
          const preview =
            lineup.imageUrls?.[0] ??
            (/\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(lineup.mediaUrl ?? '')
              ? lineup.mediaUrl
              : undefined);
          return (
            <button
              key={lineup.id}
              type="button"
              onClick={() => onSelectLineup(lineup)}
              className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-2 text-left transition-colors hover:bg-surface-2"
            >
              {preview ? (
                <LineupPhoto
                  src={preview}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-16 shrink-0 rounded-chip object-cover"
                />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-chip bg-surface-2">
                  <UtilityGlyph
                    kind={lineup.kind}
                    label={UTILITY_NAMES[lineup.kind]}
                    size="control"
                  />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-13 font-medium text-ink">{lineup.title}</span>
                <span className="text-11 text-ink-dim">{UTILITY_NAMES[lineup.kind]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
