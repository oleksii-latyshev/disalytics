import type { Coordination } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { cn } from '@disa/ui';

const TONE = {
  coordinated: 'text-ink',
  partial: 'text-ink-dim',
  loose: 'text-ink-faint',
} as const;

/** How coordinated a round read, in words, with the signals it came from a hover away. */
export function CoordinationBadge({ coordination }: { coordination: Coordination }) {
  const t = useT();
  const locale = useLocale();
  const names = coordination.signals.map((signal) =>
    t(`review.tactics.coordination.signal.${signal}`),
  );
  const signals =
    names.length === 0
      ? t('review.tactics.coordination.none')
      : new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);

  return (
    <span
      title={t('review.tactics.coordination.hint', { signals })}
      className={cn('text-12', TONE[coordination.level])}
    >
      <Text path={`review.tactics.coordination.${coordination.level}`} />
    </span>
  );
}
