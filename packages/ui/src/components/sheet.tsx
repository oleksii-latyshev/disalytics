import type * as React from 'react';
import { cn } from '../lib/utils';
import { DURATION_PANEL_SECONDS, EASE_OUT } from '../motion/easing';
import {
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
  Dialog as DialogRoot,
} from './animate-ui/primitives/base/dialog';

/* The five handlers React and `motion` both name, with different arguments each time. This is
   `UPSTREAM.md`'s second deviation seen from the other side: the popup is a `motion.div`, so a caller
   handing it a DOM `onAnimationStart` would be handing it the wrong function. No caller wants one. */
type OverlayElementProps = Omit<
  React.ComponentProps<'div'>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
>;

interface SheetProps extends OverlayElementProps {
  isOpen: boolean;
  /** Called whenever the sheet has closed, however it was closed — the button, or `Esc`. */
  onDismiss: () => void;
}

const TRANSITION = { duration: DURATION_PANEL_SECONDS, ease: EASE_OUT };

/** `transform` and `opacity` only, and the registry's blur and rotate overridden — see `Dialog`. */
const SCRIM_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: TRANSITION,
} as const;

const SHEET_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: TRANSITION,
} as const;

/**
 * The full-screen sheet behind settings, help and the match overlay — the same dialog `Dialog` is,
 * covering the viewport instead of sitting in it.
 *
 * It shares that component's history and its reason for changing: a native `<dialog>` until #277,
 * and moved onto Base UI so that a sheet can be animated *out* as well as in. There is no light
 * dismiss to build or to disable — the popup covers the screen, so there is no outside to press —
 * and `Esc` is still the dialog's own, which is why `core/shortcuts` suspends itself while a sheet
 * is open: a global handler calling `preventDefault()` on `Escape` cancels the close and traps the
 * reader inside.
 *
 * The scrim is drawn even though nothing of it can be seen. It is what the sheet's own translucency
 * is measured against on the frames the two are painted separately, and it is what covers the screen
 * for the length of the exit while the sheet slides off it.
 */
export function Sheet({ isOpen, onDismiss, className, children, ...props }: SheetProps) {
  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="dialog-scrim fixed inset-0 z-40" {...SCRIM_MOTION} />

        <DialogPopup
          className={cn(
            'surface-sheet fixed inset-0 z-50 h-dvh w-screen overflow-y-auto text-ink',
            className,
          )}
          {...SHEET_MOTION}
          {...props}
        >
          {children}
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
