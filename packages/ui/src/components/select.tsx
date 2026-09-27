import { Select as BaseSelect } from '@base-ui-components/react';
import { Check, ChevronDown } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../lib/utils';

export function Select<Value = string, Multiple extends boolean | undefined = false>(
  props: React.ComponentProps<typeof BaseSelect.Root<Value, Multiple>>,
) {
  return <BaseSelect.Root {...props} />;
}

export interface SelectTriggerProps extends React.ComponentProps<typeof BaseSelect.Trigger> {}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <BaseSelect.Trigger
      className={cn(
        'inline-flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-chip border border-line bg-surface-2 px-3 text-13 text-ink transition-[color,border-color,background-color] duration-(--duration-micro) ease-out hover:border-line-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 data-[placeholder]:text-ink-dim',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-3.5 shrink-0 opacity-60" />
    </BaseSelect.Trigger>
  );
}

export interface SelectValueProps extends React.ComponentProps<typeof BaseSelect.Value> {
  placeholder?: React.ReactNode;
}

export function SelectValue({ placeholder, children, ...props }: SelectValueProps) {
  return (
    <BaseSelect.Value {...props}>
      {children ??
        ((val: unknown) => (val != null && val !== '' ? (val as React.ReactNode) : placeholder))}
    </BaseSelect.Value>
  );
}

export interface SelectContentProps extends React.ComponentProps<typeof BaseSelect.Popup> {
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
}

export function SelectContent({
  className,
  children,
  sideOffset = 4,
  align = 'start',
  ...props
}: SelectContentProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={sideOffset} align={align} className="z-50">
        <BaseSelect.Popup
          className={cn(
            'surface-card relative z-50 max-h-64 min-w-[8rem] overflow-y-auto rounded-card border border-line bg-surface-2 p-1 text-ink shadow-float outline-none',
            className,
          )}
          {...props}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export interface SelectItemProps extends React.ComponentProps<typeof BaseSelect.Item> {}

export function SelectItem({ className, children, value, ...props }: SelectItemProps) {
  return (
    <BaseSelect.Item
      value={value}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-chip py-1.5 pl-2.5 pr-8 text-12 text-ink outline-none transition-colors duration-(--duration-micro) ease-out hover:bg-surface-3 data-[highlighted]:bg-surface-3 data-[highlighted]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <BaseSelect.ItemText className="truncate">{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
        <Check className="size-3.5 text-ink" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

export function SelectGroup(props: React.ComponentProps<typeof BaseSelect.Group>) {
  return <BaseSelect.Group {...props} />;
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.GroupLabel>) {
  return (
    <BaseSelect.GroupLabel
      className={cn('label-dense px-2 py-1.5 text-10 text-ink-dim', className)}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.Separator>) {
  return <BaseSelect.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />;
}
