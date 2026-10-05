import { Button, Dialog } from '@disa/ui';

interface Props {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Whether confirming is the destructive choice, which is then drawn as one. */
  isDestructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A question that has to be answered before the screen goes on, in the screen rather than the system's. */
export function LineupConfirmDialog(props: Props) {
  const { message, confirmLabel, cancelLabel, isDestructive, onConfirm, onCancel } = props;

  return (
    <Dialog
      isOpen
      onDismiss={onCancel}
      aria-label={message}
      data-shortcuts-suspended
      className="flex w-[min(92vw,26rem)] flex-col gap-4 p-5"
    >
      <p className="text-14 text-ink leading-prose">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={isDestructive ? 'destructive' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
