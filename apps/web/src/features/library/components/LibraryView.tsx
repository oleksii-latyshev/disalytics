import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { SavedDemoRow } from './SavedDemoRow';

interface Props {
  onOpen: (demo: SavedDemo) => void;
}

/**
 * Every demo this device holds — §10.2. The way-in card keeps the five most recent; this screen is
 * where all of them live.
 *
 * The rows are the ones #140 shipped. §10.2's grid of cards, the two storage figures in its header
 * and the dialog a press opens are the next issue's, and nothing here is shaped to prevent them.
 */
export function LibraryView({ onOpen }: Props) {
  const { demos, forget } = useSavedDemos();

  return (
    <section className="mx-auto flex w-full max-w-[42rem] flex-col gap-4">
      <h2 className="font-ui text-20 leading-dense">
        <Text path="library.shell.library" />
      </h2>

      {/* `null` is the store not having answered yet, which is not the same fact as an empty
          cache and must not flash the empty state on its way in. */}
      {demos !== null &&
        (demos.length === 0 ? (
          <p className="text-13 text-ink-dim leading-prose">
            <Text path="library.shell.empty" />
          </p>
        ) : (
          <>
            <ul className="flex list-none flex-col gap-2 p-0">
              {demos.map((demo) => (
                <SavedDemoRow key={demo.key} demo={demo} onOpen={onOpen} onRemove={forget} />
              ))}
            </ul>

            <p className="text-12 text-ink-faint leading-prose">
              <Text path="library.saved.note" />
            </p>
          </>
        ))}
    </section>
  );
}
