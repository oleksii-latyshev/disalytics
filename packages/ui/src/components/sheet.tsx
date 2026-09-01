import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

interface SheetProps extends Omit<React.ComponentProps<'dialog'>, 'open' | 'onClose'> {
  isOpen: boolean;
  /** Called whenever the sheet has closed, however it was closed — the button, or the platform. */
  onDismiss: () => void;
}

/**
 * The full-screen sheet behind settings and help: a native `<dialog>` opened with `showModal()`, not a
 * dialog from the component registry. The platform gives the top layer, the focus trap and the `Esc`
 * close request; the registry's version would ship a second focus manager to arrive at the same
 * behaviour. There is no light-dismiss to build either — the sheet covers the screen, so `::backdrop`
 * is never exposed and `closedby` would have nothing to be clicked on.
 *
 * `Esc` is the platform's rather than ours, which is why `core/shortcuts` suspends itself while a
 * sheet is open: a global handler calling `preventDefault()` on `Escape` cancels the close request
 * and traps the reader inside the sheet's own binding.
 */
export function Sheet({ isOpen, onDismiss, className, children, ...props }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null || dialog.open === isOpen) return;

    if (isOpen) {
      dialog.showModal();
      return;
    }

    dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      onClose={onDismiss}
      className={cn(
        'surface-sheet fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 p-0 text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </dialog>
  );
}
