import { Text, type TranslationKey } from '@disa/i18n';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  labelPath: TranslationKey;
  isCurrent?: boolean;
  isSoon?: boolean;
  tone: string;
  onSelect: () => void;
}

export function DockEntry({ icon: Icon, labelPath, isCurrent, isSoon, tone, onSelect }: Props) {
  return (
    <span className="atlas-dock-seat group relative flex items-center justify-center">
      <button
        type="button"
        data-dock-item
        aria-current={isCurrent ? 'page' : undefined}
        onClick={onSelect}
        style={{ background: tone }}
        className="atlas-dock-tile relative flex origin-bottom items-center justify-center text-white transition-[scale] duration-(--duration-micro) ease-out"
      >
        <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />

        <span className="sr-only">
          <Text path={labelPath} />
          {isSoon && (
            <>
              {' '}
              <Text path="common.soon" />
            </>
          )}
        </span>
      </button>

      {isCurrent && (
        <span aria-hidden="true" className="absolute -bottom-1 size-1 rounded-full bg-ink" />
      )}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-chip border border-line bg-surface-3 px-2 py-1 text-12 text-ink opacity-0 shadow-lg transition-opacity duration-(--duration-micro) ease-out group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        <Text path={labelPath} />

        {isSoon && (
          <span className="label-dense rounded-chip border border-line px-1 py-0.5 text-ink-dim">
            <Text path="common.soon" />
          </span>
        )}
      </span>
    </span>
  );
}
