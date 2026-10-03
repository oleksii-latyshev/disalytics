import { Text, useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { LineupPhoto } from './LineupPhoto';

export function EnlargedPhotoDialog({
  url,
  onDismiss,
}: {
  readonly url: string | null;
  readonly onDismiss: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (url === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [url, onDismiss]);

  if (url === null) return null;

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-[200] bg-black/70" onClick={onDismiss} aria-hidden="true" />
      {/* Card */}
      <div className="pointer-events-none fixed inset-0 z-[200] grid place-items-center p-4">
        <div
          role="dialog"
          aria-label={t('library.lineups.form.viewPhoto')}
          className="pointer-events-auto relative max-h-[92dvh] max-w-[92dvw] rounded-sheet p-2"
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('library.lineups.form.closePhoto')}
            className="absolute top-2 right-2 z-10 rounded-chip bg-surface-0/80 p-1.5 text-ink hover:bg-surface-2"
          >
            <X className="size-5" />
          </button>
          <LineupPhoto
            src={url}
            alt=""
            className="max-h-[85dvh] max-w-[85dvw] rounded-chip object-contain"
          />
        </div>
      </div>
    </>
  );
}

export function CatboxNoticeDialog({
  isOpen,
  dontRemind,
  onDontRemindChange,
  onDismiss,
  onProceed,
}: {
  readonly isOpen: boolean;
  readonly dontRemind: boolean;
  readonly onDontRemindChange: (checked: boolean) => void;
  readonly onDismiss: () => void;
  readonly onProceed: () => void;
}) {
  const t = useT();
  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={onDismiss}
      aria-label={t('library.lineups.form.catboxModal.title')}
      className="flex max-w-md flex-col gap-4 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-ui text-16 font-medium text-ink">
          <Text path="library.lineups.form.catboxModal.title" />
        </h3>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.close')}
          className="rounded-chip p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-12 text-ink-dim leading-relaxed">
        <Text path="library.lineups.form.catboxModal.description" />
      </p>
      <label className="flex cursor-pointer items-center gap-2 text-12 text-ink">
        <input
          type="checkbox"
          checked={dontRemind}
          onChange={(e) => onDontRemindChange(e.target.checked)}
          className="size-4 rounded-chip border-line bg-surface-2"
        />
        <Text path="library.lineups.form.catboxModal.dontShowAgain" />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDismiss} className="px-3 text-12">
          <Text path="library.lineups.form.cancel" />
        </Button>
        <Button type="button" onClick={onProceed} className="px-4 text-12">
          <Text path="library.lineups.form.catboxModal.proceed" />
        </Button>
      </div>
    </Dialog>
  );
}
