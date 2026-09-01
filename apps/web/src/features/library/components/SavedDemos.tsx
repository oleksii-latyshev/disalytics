import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { RECENT_COUNT, visibleDemos } from '../helpers/saved-list';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { DemoDialog } from './DemoDialog';
import { SavedDemoRow } from './SavedDemoRow';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onShowAll: () => void;
}

/**
 * The five most recent demos this device holds, on the way-in card. Nothing is drawn when there are
 * none: an empty list would be a promise the product has not kept yet, and the way in says enough on
 * its own.
 *
 * **The rest are a screen rather than a disclosure.** They expanded in place until the shell had a
 * Library entry to send them to; keeping both would have been the same list in two states one press
 * apart.
 */
export function SavedDemos({ onEnter, onShowAll }: Props) {
  const { demos, forget } = useSavedDemos();
  const [opened, setOpened] = useState<SavedDemo | null>(null);

  if (demos === null || demos.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="label-dense text-ink-dim">
        <Text path="library.saved.title" />
      </h3>

      <ul className="flex list-none flex-col gap-2 p-0">
        {visibleDemos(demos).map((demo) => (
          <SavedDemoRow key={demo.key} demo={demo} onOpen={setOpened} onRemove={forget} />
        ))}
      </ul>

      {demos.length > RECENT_COUNT && (
        <Button type="button" variant="ghost" className="self-start" onClick={onShowAll}>
          <Text path="library.saved.showAll" values={{ count: demos.length }} />
        </Button>
      )}

      <p className="text-12 text-ink-dim leading-prose">
        <Text path="library.saved.note" />
      </p>

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
