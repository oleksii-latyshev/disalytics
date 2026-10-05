import type { Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Bookmark, Check } from 'lucide-react';

interface Props {
  /** The lineup this variant was saved as, or `undefined` while it is not saved. */
  saved: Lineup | undefined;
  isSaving: boolean;
  hasFailed: boolean;
  onSave: () => void;
  onEdit: () => void;
  onUndo: () => void;
}

/**
 * The one press that keeps a lineup: it saves with everything the throw recorded, and then says so
 * where the button was, with the two things a reader may want next. The saved state is read from the
 * lineups themselves, so it is true after a reload and after saving from another tab.
 */
export function LineupSave({ saved, isSaving, hasFailed, onSave, onEdit, onUndo }: Props) {
  if (saved !== undefined) {
    return (
      <div
        role="status"
        className="flex min-h-11 items-center gap-2.5 rounded-card border border-line-strong px-2.5 py-1.5"
      >
        <Check aria-hidden="true" className="size-4 shrink-0 text-ink" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-13 text-ink">
            <Text path="review.lineups.save.saved" />
          </span>
          <span className="truncate text-11 text-ink-dim">{saved.title}</span>
        </span>
        <Button variant="link" size="default" onClick={onEdit} className="h-7 px-1 text-12">
          <Text path="review.lineups.save.edit" />
        </Button>
        <Button
          variant="ghost"
          size="default"
          onClick={onUndo}
          className="h-7 px-2 text-12 text-ink-dim"
        >
          <Text path="review.lineups.save.undo" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" disabled={isSaving} onClick={onSave} className="w-full">
        <Bookmark aria-hidden="true" />
        <Text path="review.lineups.save.action" />
      </Button>
      {hasFailed ? (
        <p role="alert" className="text-center text-11 text-ink">
          <Text path="review.lineups.save.failed" />
        </p>
      ) : (
        <p className="text-center text-11 text-ink-dim">
          <Text path="review.lineups.save.hint" />
        </p>
      )}
    </div>
  );
}
