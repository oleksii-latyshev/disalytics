import type { LucideIcon } from 'lucide-react';

/** The mark a widget carries. Achromatic: the dock's tiles are the way in's only chroma (§17). */
export function WidgetBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-chip border border-line bg-surface-3 text-ink md:size-9"
    >
      <Icon className="size-4 md:size-[18px]" strokeWidth={1.8} />
    </span>
  );
}
