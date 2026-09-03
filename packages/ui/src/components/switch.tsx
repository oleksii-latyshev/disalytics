import type * as React from 'react';
import { cn } from '../lib/utils';

/**
 * A two-state control for a setting. It is a plain checkbox rather than a button or a registry
 * primitive: the platform gives `Space`, the label association and the checked state
 * assistive technology reads, and none of that has to be re-implemented in order to be styled.
 *
 * It deliberately carries **no `role="switch"`**. The role would need `aria-checked` written beside
 * the input's own `checked`, which is one state in two places and wrong the moment they disagree; a
 * checkbox that looks like a switch reads correctly either way.
 *
 * The knob is a sibling element rather than a pseudo-element on the input: `::after` on a replaced
 * element is only rendered once `appearance: none` has taken the element out of that category, which
 * is true in some engines and not others. A sibling is the same two nodes with none of that doubt.
 *
 * The on state is `--color-ink` and the knob inverts to the ground on it — interaction is
 * luminance, and there is no chromatic accent left to fill it with. The knob moves by `translate`
 * and never by `left` — and the transition **names `translate`**, because Tailwind's `translate-x-4`
 * writes that property rather than the `transform` shorthand, and an arbitrary list naming
 * `transform` transitions a property this element never sets: the colour tweened while the knob
 * jumped, which is a working animation to every check that samples the two ends.
 */
export function Switch({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        data-slot="switch"
        className={cn(
          'peer h-6 w-10 cursor-pointer appearance-none rounded-full bg-selected transition-colors duration-(--duration-micro) ease-out checked:bg-ink',
          className,
        )}
        {...props}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-ink transition-[translate,background-color] duration-(--duration-micro) ease-out peer-checked:translate-x-4 peer-checked:bg-surface-0"
      />
    </span>
  );
}
