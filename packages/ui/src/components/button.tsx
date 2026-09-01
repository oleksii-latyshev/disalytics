import { useRender } from '@base-ui-components/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/utils';

/**
 * The transition names its properties rather than being `transition-all`: a list is what makes a
 * variant that changes padding or a width a visible edit instead of a silent layout tween. Nothing
 * may join it that triggers layout.
 *
 * **Focus is not styled here.** `base.css` puts a 2px `--color-focus` outline on `:focus-visible`
 * for every element in the product, and this used to set `outline-none` and rebuild it as a ring —
 * two focus treatments, one of which only some components had. The global one is the only one now.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-chip font-medium text-13 transition-[color,background-color,border-color,box-shadow,opacity] duration-(--duration-micro) ease-out disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The one loud control a screen is allowed. It is the ground in ink — 19.53:1, the highest
        // contrast the palette can make — and it is loud by luminance rather than by hue, which is
        // what lets it sit on a screen full of Counter-Terrorist blue without competing with it.
        // The violet `accent` variant this replaces is gone with the token behind it.
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-ink hover:bg-destructive/90',
        outline: 'border border-line text-ink hover:bg-hover hover:border-line-strong',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-3',
        // Inherits its colour rather than setting one, which is what lets a strip of icon buttons be
        // lit and dimmed by the container they sit in — the corner cluster does exactly that.
        ghost: 'hover:bg-hover',
        link: 'text-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-control gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-control-lg px-4 has-[>svg]:px-3',
        // The square sizes read the height token rather than a `--size-*` of their own. Each of the
        // product's two control heights is one number; a second token holding it would be a copy
        // free to drift.
        icon: 'size-(--height-control) p-0',
        'icon-lg': 'size-(--height-control-lg) p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Render as something other than a `<button>`, merging props into the element given. Base UI's
     * own mechanism, and the reason `radix-ui` is no longer a dependency of this package — it was
     * carried for `Slot` and for nothing else.
     */
    render?: useRender.RenderProp;
  };

function Button({ className, variant, size, render, ...props }: ButtonProps) {
  return useRender({
    render: render ?? <button type="button" />,
    props: {
      'data-slot': 'button',
      'data-variant': variant ?? 'primary',
      'data-size': size ?? 'default',
      className: cn(buttonVariants({ variant, size, className })),
      ...props,
    },
  });
}

export { Button, buttonVariants };
