import type * as React from 'react';
import { cn } from '../lib/utils';
import { DURATION_BASE_SECONDS, EASE_OUT } from '../motion/easing';
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

interface DialogProps extends OverlayElementProps {
  isOpen: boolean;
  /** Called whenever the dialog has closed, however it was closed — a button, `Esc`, or the ground. */
  onDismiss: () => void;
}

const TRANSITION = { duration: DURATION_BASE_SECONDS, ease: EASE_OUT };

/**
 * The scrim and the card, on `transform` and `opacity` alone.
 *
 * The registry's own popup arrives with a `filter: blur(4px)` and a 20° `rotateX` on a 500px
 * perspective. Both are overridden here rather than in the vendored file — the primitive spreads the
 * caller's props over its defaults, which is what makes an override possible without an edit
 * upstream would take back. The blur is the half that matters: animating a filter over a
 * full-viewport surface is the one cost `AGENTS.md` §17 rule 1 exists to refuse.
 */
const SCRIM_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: TRANSITION,
} as const;

const CARD_MOTION = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
  transition: TRANSITION,
} as const;

/**
 * A card in the top layer, on Base UI's dialog through animate-ui's primitive.
 *
 * **It was a native `<dialog>` until #277**, opened with `showModal()`, and the argument for that was
 * a good one: the top layer, the focus trap, the `Esc` close request and `closedby="any"` light
 * dismiss are all the platform's, so none of them has to be re-implemented in order to be styled.
 * What the platform will not do is let a dialog *leave*. `close()` is immediate and removes the
 * element from the top layer in the same frame, so an exit animation has to be run by holding the
 * element open and closing it on a timer — a second state machine, racing the first. Base UI keeps
 * the popup mounted through `AnimatePresence` instead, and everything the native element was carried
 * here for it also does: focus is trapped and restored, page scroll is locked, `Esc` closes, and a
 * press outside the popup closes (`disablePointerDismissal` defaults to `false`).
 *
 * The consequence for callers: **the popup is portalled to the end of `<body>`**, so it is out of
 * the shell's stacking context entirely and no `z-index` on the way in can cover it. The `open:`
 * prefix the native version needed on its display utility is gone with the element it was working
 * around.
 */
export function Dialog({ isOpen, onDismiss, className, children, ...props }: DialogProps) {
  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="dialog-scrim fixed inset-0 z-40" {...SCRIM_MOTION} />

        {/* The popup is centred by the grid around it rather than by a translate of its own: the
            card's own transform is what the open animates, and a `-translate-1/2` centring it would
            be overwritten the moment `motion` writes `style.transform`. */}
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <DialogPopup
            className={cn(
              // `--shadow-float` is the one shadow in the product, and it names this surface by
              // name: a card that has escaped the layout entirely.
              'surface-card pointer-events-auto flex flex-col rounded-sheet text-ink shadow-float',
              className,
            )}
            {...CARD_MOTION}
            {...props}
          >
            {children}
          </DialogPopup>
        </div>
      </DialogPortal>
    </DialogRoot>
  );
}
