import type { TranslationKey } from '@disa/i18n';
import { Text } from '@disa/i18n';

/** The two entries §10.1 keeps honest about being unfinished, and what each will hold. */
const PROMISE: Record<
  'lineups' | 'stats',
  { titlePath: TranslationKey; notePath: TranslationKey }
> = {
  lineups: { titlePath: 'library.shell.lineups', notePath: 'library.shell.soonNote.lineups' },
  stats: { titlePath: 'library.shell.stats', notePath: 'library.shell.soonNote.stats' },
};

/**
 * Pressing an unfinished entry says what the screen will do and nothing else — §10.1. No spinner,
 * no mock-up and no waiting list: the navigation shape is what exists, and the screen behind it
 * does not pretend otherwise.
 */
export function SoonView({ view }: { view: 'lineups' | 'stats' }) {
  const { titlePath, notePath } = PROMISE[view];

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-3">
      <h2 className="font-ui text-20 leading-dense">
        <Text path={titlePath} />
      </h2>
      <p className="text-13 text-ink-dim leading-prose">
        <Text path={notePath} />
      </p>
    </section>
  );
}
