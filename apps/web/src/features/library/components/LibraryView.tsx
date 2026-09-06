import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { useState } from 'react';
import { SAMPLE_MATCHES, type SampleMatch, sampleKey } from '@/core/samples';
import { useSetting } from '@/core/settings';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { DemoCard } from './DemoCard';
import { DemoDialog } from './DemoDialog';
import { LibraryStorage } from './LibraryStorage';
import { SampleCard } from './SampleCard';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
}

/**
 * Every demo this device holds. The way-in card keeps the five most recent; this screen is where all
 * of them live, **as a grid of cards rather than a list of rows**: a row is a filing cabinet, and a
 * card can carry the map, which is how a reader recognises a match they downloaded a week ago.
 *
 * The track floor is what keeps the grid honest at both ends — one column on a phone, and never the
 * two columns at 1024 that the rail turns into a row to avoid.
 *
 * An entry with no metadata, a stale `SCHEMA_VERSION` or a file that has gone never reaches here:
 * the store drops all three, so a card that cannot be opened is never drawn.
 *
 * **A press opens the dialog rather than the match.** The dialog holds a parse only while it is open,
 * and it is owned here rather than by the shell because a read that finds no file has to take the
 * card with it — and `forget` is the list's.
 */
export function LibraryView({ onEnter, onSample }: Props) {
  const { demos, forget } = useSavedDemos();
  const [theme] = useSetting('radarTheme');
  const [opened, setOpened] = useState<SavedDemo | null>(null);

  // A sample that has been opened is a saved demo like any other and is listed as one, so it leaves
  // this row the moment it lands and comes back if the reader removes it. `demos` is `null` until
  // the store answers, and offering a download for something already on the device would be the
  // one wrong thing to flash on the way in.
  const offered =
    demos === null
      ? []
      : SAMPLE_MATCHES.filter((sample) => !demos.some((demo) => demo.key === sampleKey(sample.id)));

  return (
    <section className="mx-auto flex w-full max-w-[72rem] flex-col gap-4">
      <header className="flex flex-col gap-2">
        {/* The count sits beside the title rather than at the far edge of the column. Pushed right
            it is a figure a thousand pixels from the thing it counts, and on a one-card library it
            reads as a stray. */}
        <div className="flex items-baseline gap-3">
          <h2 className="font-ui font-medium text-20 leading-dense">
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

      {offered.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-ui font-medium text-14 leading-dense">
              <Text path="library.samples.title" />
            </h3>

            <p className="max-w-[64ch] text-12 text-ink-dim leading-prose">
              <Text path="library.samples.note" />
            </p>
          </div>

          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3 p-0">
            {offered.map((sample) => (
              <SampleCard key={sample.id} sample={sample} theme={theme} onOpen={onSample} />
            ))}
          </ul>
        </section>
      )}

      {/* `null` is the store not having answered yet, which is not the same fact as an empty cache
          and must not flash the empty state on its way in. The heading is what keeps "nothing here
          yet" true with two sample cards above it: that line is about the reader's own demos, and
          without a heading over them it reads as a denial of the cards it sits under. */}
      {demos !== null && (
        <section className="flex flex-col gap-3">
          <h3 className="font-ui font-medium text-14 leading-dense">
            <Text path="library.saved.title" />
          </h3>

          {demos.length === 0 ? (
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
          )}
        </section>
      )}

      {/* Mounted whether or not it is open — an exit animation needs an element that still exists.
          It holds no parse while it is closed; `DemoDialog` drops it as `saved` goes. */}
      <DemoDialog
        saved={opened}
        onEnter={onEnter}
        onDismiss={() => setOpened(null)}
        onGone={forget}
      />
    </section>
  );
}
