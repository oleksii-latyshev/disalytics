import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { RECENT_COUNT, visibleDemos } from '../helpers/saved-list';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { SavedDemoRow } from './SavedDemoRow';

interface Props {
  onOpen: (demo: SavedDemo) => void;
}

/**
 * The demos this device already holds — `docs/DESIGN.md` §10.2. Nothing is drawn when there are
 * none: an empty list would be a promise the product has not kept yet, and the way in says enough
 * on its own.
 */
export function SavedDemos({ onOpen }: Props) {
  const { demos, forget } = useSavedDemos();
  const [isExpanded, setExpanded] = useState(false);

  if (demos === null || demos.length === 0) return null;

  const shown = visibleDemos(demos, isExpanded);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="label-dense text-ink-dim">
        <Text path="library.saved.title" />
      </h3>

      <ul className="flex list-none flex-col gap-2 p-0">
        {shown.map((demo) => (
          <SavedDemoRow key={demo.key} demo={demo} onOpen={onOpen} onRemove={forget} />
        ))}
      </ul>

      {demos.length > RECENT_COUNT && (
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => setExpanded(!isExpanded)}
        >
          <Text
            path={isExpanded ? 'library.saved.showFewer' : 'library.saved.showAll'}
            values={{ count: demos.length }}
          />
        </Button>
      )}

      <p className="text-12 text-ink-faint leading-prose">
        <Text path="library.saved.note" />
      </p>
    </section>
  );
}
