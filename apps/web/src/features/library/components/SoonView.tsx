import type { TranslationKey } from '@disa/i18n';
import { Text } from '@disa/i18n';

/** The two entries the rail keeps honest about being unfinished, and what each will hold. */
const PROMISE: Record<
  'lineups' | 'stats',
  { titlePath: TranslationKey; notePath: TranslationKey }
> = {
  lineups: { titlePath: 'library.shell.lineups', notePath: 'library.shell.soonNote.lineups' },
  stats: { titlePath: 'library.shell.stats', notePath: 'library.shell.soonNote.stats' },
};

/**
 * Pressing an unfinished entry says what the screen will do and nothing else. No spinner, no
 * mock-up and no waiting list: the navigation shape is what exists, and the screen behind it does
 * not pretend otherwise.
 *
 * **It is centred and it carries the same chip the rail does**, which is the difference between
 * deliberately empty and not finished loading. A heading pinned to the top of an otherwise blank
 * column reads as a page whose content failed to arrive; a short block in the middle of the room,
 * marked with the word the rail already used, reads as a room that has not been built yet.
 */
export function SoonView({ view }: { view: 'lineups' | 'stats' }) {
  const { titlePath, notePath } = PROMISE[view];

  return (
    <div className="flex min-h-full items-center justify-center">
      <section className="flex w-full max-w-[32rem] flex-col items-start gap-3">
        <p className="label-dense rounded-chip border border-line px-1.5 py-0.5 text-ink-dim">
          <Text path="library.shell.soon" />
        </p>

        <h2 className="font-ui font-medium text-28 leading-dense">
          <Text path={titlePath} />
        </h2>

        <p className="text-13 text-ink-dim leading-prose">
          <Text path={notePath} />
        </p>
      </section>
    </div>
  );
}
