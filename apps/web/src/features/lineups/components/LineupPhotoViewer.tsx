import type { Lineup } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import { X } from 'lucide-react';
import { captionsOf, photosOf } from '../helpers/lineup-photos';
import { LineupImageViewer } from './LineupImageViewer';

interface Props {
  lineup: Lineup;
  /** The photo it opens on. */
  index: number;
  onDismiss: () => void;
}

/** A lineup's photos at size, with their captions, zoom and pan. */
export function LineupPhotoViewer({ lineup, index, onDismiss }: Props) {
  const t = useT();

  return (
    <Dialog
      isOpen
      onDismiss={onDismiss}
      aria-label={lineup.title}
      className="flex h-[min(86dvh,52rem)] w-[min(94vw,72rem)] flex-col overflow-hidden p-0"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 [border-block-end:1px_solid_var(--color-line)] bg-surface-1 pr-2 pl-4">
        <h2 className="truncate font-semibold text-14 text-ink">{lineup.title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.close')}
          className="text-ink-dim"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <LineupImageViewer
        title={lineup.title}
        imageUrls={photosOf(lineup)}
        imageCaptions={captionsOf(lineup)}
        kind={lineup.kind}
        initialIndex={index}
      />
    </Dialog>
  );
}
