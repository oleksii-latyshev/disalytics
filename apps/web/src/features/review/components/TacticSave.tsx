import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Link } from '@tanstack/react-router';
import { Bookmark, Check } from 'lucide-react';

interface Props {
  id: string;
  /** The title the tactic was saved under, or `undefined` while it is not saved. */
  savedTitle: string | undefined;
  isSaving: boolean;
  hasFailed: boolean;
  onSave: () => void;
  onUndo: () => void;
}

/**
 * The one press that keeps a round's tactic, and then says so where the button was, with the two
 * things a reader may want next. Whether it is saved is read from the store by the tactic's id.
 */
export function TacticSave({ id, savedTitle, isSaving, hasFailed, onSave, onUndo }: Props) {
  if (savedTitle !== undefined) {
    return (
      <div
        role="status"
        className="flex min-h-11 items-center gap-2.5 rounded-card border border-line-strong px-2.5 py-1.5"
      >
        <Check aria-hidden="true" className="size-4 shrink-0 text-ink" />
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold text-13 text-ink">
            <Text path="review.tactics.save.saved" />
          </span>
          <span className="truncate text-11 text-ink-dim">{savedTitle}</span>
        </span>
        <Link
          to="/tactics"
          search={{ open: id }}
          className="px-1 text-12 font-medium text-ink underline underline-offset-4"
        >
          <Text path="review.tactics.save.open" />
        </Link>
        <Button
          variant="ghost"
          size="default"
          onClick={onUndo}
          className="h-7 px-2 text-12 text-ink-dim"
        >
          <Text path="review.tactics.save.undo" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="lg" disabled={isSaving} onClick={onSave}>
        <Bookmark aria-hidden="true" />
        <Text path="review.tactics.save.action" />
      </Button>
      {hasFailed ? (
        <p role="alert" className="text-11 text-ink">
          <Text path="review.tactics.save.failed" />
        </p>
      ) : (
        <p className="text-11 text-ink-dim">
          <Text path="review.tactics.save.hint" />
        </p>
      )}
    </div>
  );
}
