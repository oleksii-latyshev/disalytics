import type { LineupTag } from '@disa/demo-core';
import { Text } from '@disa/i18n';

const TAG_STYLES: Readonly<Record<LineupTag, string>> = {
  meta: 'border-line-strong bg-surface-3 font-medium text-ink',
  old: 'border-line bg-transparent text-ink-dim/70',
};

export function LineupTagChips({
  tags,
  className = 'px-1.5 py-0.5 text-10',
}: {
  readonly tags: readonly LineupTag[] | undefined;
  readonly className?: string;
}) {
  return (
    <>
      {tags?.map((tag) => (
        <span key={tag} className={`shrink-0 rounded-chip border ${TAG_STYLES[tag]} ${className}`}>
          <Text path={`library.lineups.tags.${tag}`} />
        </span>
      ))}
    </>
  );
}
