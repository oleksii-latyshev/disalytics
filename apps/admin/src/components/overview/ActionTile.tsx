import { Text, type TranslationKey } from '@disa/i18n';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * A place to go, in the identity colour of its dock section. The text sits on a scrim so it reads
 * on the bright end of the gradient; the whole tile is one link.
 */
export function ActionTile({
  href,
  tone,
  icon: Icon,
  title,
  text,
  count,
}: {
  href: string;
  tone: string;
  icon: LucideIcon;
  title: TranslationKey;
  text: TranslationKey;
  /** One line of what is there now; absent while it is not known. */
  count: ReactNode;
}) {
  return (
    <a
      href={href}
      style={{ background: tone }}
      className="group relative flex size-full min-h-36 flex-col justify-between gap-3 p-4 text-white md:p-5"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-black/15 to-transparent"
      />
      <span
        aria-hidden="true"
        className="relative flex size-10 items-center justify-center rounded-card border border-white/25 bg-white/15 transition-transform duration-(--duration-micro) group-hover:scale-105"
      >
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="relative flex flex-col gap-1">
        <span className="break-words font-medium text-16 leading-dense">
          <Text path={title} />
        </span>
        <span className="text-12 text-white/85 leading-prose">
          <Text path={text} />
        </span>
        {count === null ? null : <span className="numeric text-12 text-white/85">{count}</span>}
      </span>
    </a>
  );
}
