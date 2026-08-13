import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        // The ink on an accent fill is the stage colour, not `--ink`, and the token says so:
        // `--accent-ink` on `--accent` reads 6.80:1 where `--ink` reads 2.70:1. DESIGN.md §2.5
        // no longer fences where this variant may appear, but it still may not fill anything that
        // represents a player, a side, a weapon or an event.
        accent: 'bg-accent text-accent-ink hover:bg-accent/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline: 'border bg-input/30 shadow-xs hover:bg-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-hover',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-control gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-control-lg px-4 has-[>svg]:px-3',
        // The square sizes read the height token rather than a --size-* of their own. Each of
        // DESIGN.md §4's two heights is one number; a second token holding it would be a copy
        // free to drift.
        icon: 'size-(--height-control) p-0',
        'icon-lg': 'size-(--height-control-lg) p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
