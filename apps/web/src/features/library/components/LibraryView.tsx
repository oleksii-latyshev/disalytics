import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { useState } from 'react';
import { useSetting } from '@/core/settings';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { DemoCard } from './DemoCard';
import { DemoDialog } from './DemoDialog';
import { LibraryStorage } from './LibraryStorage';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
}

/**
 * Every demo this device holds — §10.2. The way-in card keeps the five most recent; this screen is
 * where all of them live, **as a grid of cards rather than a list of rows**: a row is a filing
 * cabinet, and a card can carry the map, which is how a reader recognises a match they downloaded a
 * week ago.
 *
 * The track floor is what keeps the grid honest at both ends — one column on a phone, and never the
 * two columns at 1024 that §10.1 turns the rail into a row to avoid.
 *
 * An entry with no metadata, a stale `SCHEMA_VERSION` or a file that has gone never reaches here:
 * the store drops all three, so a card that cannot be opened is never drawn.
 *
 * **A press opens the dialog rather than the match** (§10.2). The dialog is mounted only while it is
 * open, which is what releases the parse it read, and it is owned here rather than by the shell
 * because a read that finds no file has to take the card with it — and `forget` is the list's.
 */
export function LibraryView({ onEnter }: Props) {
  const { demos, forget } = useSavedDemos();
  const [theme] = useSetting('radarTheme');
  const [opened, setOpened] = useState<SavedDemo | null>(null);

  return (
    <section className="mx-auto flex w-full max-w-[72rem] flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-ui text-20 leading-dense">
            <Text path="library.shell.library" />
          </h2>

          {demos !== null && demos.length > 0 && (
            <p className="numeric shrink-0 text-13 text-ink-dim">
              <Text path="library.grid.count" values={{ count: demos.length }} />
            </p>
          )}
        </div>

        {demos !== null && demos.length > 0 && <LibraryStorage demos={demos} />}
      </header>

      {/* `null` is the store not having answered yet, which is not the same fact as an empty cache
          and must not flash the empty state on its way in. */}
      {demos !== null &&
        (demos.length === 0 ? (
          <p className="text-13 text-ink-dim leading-prose">
            <Text path="library.shell.empty" />
          </p>
        ) : (
          <>
            <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3 p-0">
              {demos.map((demo) => (
                <DemoCard
                  key={demo.key}
                  demo={demo}
                  theme={theme}
                  onOpen={setOpened}
                  onRemove={forget}
                />
              ))}
            </ul>

            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.saved.note" />
            </p>
          </>
        ))}

      {opened !== null && (
        <DemoDialog
          saved={opened}
          onEnter={onEnter}
          onDismiss={() => setOpened(null)}
          onGone={forget}
        />
      )}
    </section>
  );
}
