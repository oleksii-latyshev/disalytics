import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/utils';

/**
 * A field is a surface one step up from the card it sits in, with a hairline round it — the same
 * elevation model everything else uses, rather than a border on a transparent ground. Focus is the
 * global `:focus-visible` outline; the ring this used to draw is gone with the rest of the
 * duplicate focus treatments.
 */
const inputVariants = cva(
  [
    'w-full min-w-0 rounded-chip border border-line bg-surface-2 px-3 text-13 text-ink transition-[color,border-color,background-color] duration-(--duration-micro) ease-out',
    'selection:bg-primary selection:text-primary-foreground placeholder:text-ink-dim',
    'hover:border-line-strong',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'aria-invalid:border-destructive',
    'file:inline-flex file:h-control file:border-0 file:bg-transparent file:font-medium file:text-13 file:text-ink',
  ],
  {
    variants: {
      size: {
        default: 'h-control',
        lg: 'h-control-lg',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

function Input({
  className,
  type,
  size = 'default',
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
