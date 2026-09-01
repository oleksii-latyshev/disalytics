import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

interface DialogProps extends Omit<React.ComponentProps<'dialog'>, 'open' | 'onClose'> {
  isOpen: boolean;
  /** Called whenever the dialog has closed, however it was closed — a button, or the platform. */
  onDismiss: () => void;
}

/**
 * Whether a press landed on the ground around the dialog rather than on the dialog. Both are the
 * element itself as far as the event is concerned, so the box is what tells them apart.
 */
function isPressOutside(dialog: HTMLDialogElement, event: MouseEvent): boolean {
  if (event.target !== dialog) return false;

  const box = dialog.getBoundingClientRect();

  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

/**
 * A card in the top layer. Native `<dialog>` opened with
 * `showModal()`, for the reason `Sheet` is: the top layer, the focus trap and the `Esc` close
 * request are the platform's, and a dialog from the component registry would ship a second focus
 * manager to arrive at the same behaviour.
 *
 * It differs from `Sheet` in the one way that matters — the ground around it is exposed, so a press
 * on it has to dismiss. `closedby="any"` is the declarative form of that and is what runs wherever
 * it exists; **Safari has no implementation, and the fallback is the listener the feature's own
 * guidance names**. The attribute is set from here rather than written in JSX because `in` on the
 * element is the feature test as well as the write.
 *
 * The card is the `<dialog>` itself rather than a child of a full-viewport one, which is what makes
 * `closedby` able to fire at all: light dismiss is a press *outside the element*, and an element
 * covering the viewport has no outside. The consequence for callers is that **`display` must be
 * written behind `open:`** — a bare `flex` would beat the UA's `dialog:not([open]) { display: none }`
 * and put the dialog on screen while it is closed.
 */
export function Dialog({ isOpen, onDismiss, className, children, ...props }: DialogProps) {
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

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;

    if ('closedBy' in dialog) {
      dialog.setAttribute('closedby', 'any');
      return;
    }

    const dismiss = (event: MouseEvent): void => {
      if (isPressOutside(dialog, event)) dialog.close();
    };

    dialog.addEventListener('click', dismiss);

    return () => dialog.removeEventListener('click', dismiss);
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onDismiss}
      className={cn(
        // `--shadow-float` is the one shadow in the product, and it names this surface by name: a
        // card that has escaped the layout entirely.
        // `m-auto` is what centres a modal `<dialog>`, and it is written here because Tailwind's
        // preflight zeroes the margin the UA stylesheet sets for exactly this purpose.
        'surface-card dialog-scrim m-auto rounded-sheet border-0 p-0 text-ink shadow-float',
        className,
      )}
      {...props}
    >
      {children}
    </dialog>
  );
}
