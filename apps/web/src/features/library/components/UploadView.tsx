import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { AnimatePresence, DURATION_BASE_SECONDS, EASE_OUT, m } from '@disa/ui';
import type { ParseState } from '@/core/parsing';
import { DemoLibrary } from './DemoLibrary';

interface Props {
  // An opened demo is the review screen's, so it never reaches here.
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onClose: () => void;
  onShowAll: () => void;
  isDraggedOver: boolean;
}

/**
 * The upload view: one card, centred, with room around it. Emptiness here is confidence — feature
 * bullets would be the opposite.
 *
 * **It leads with the action rather than with the product name.** The name is the rail's, two
 * hundred pixels away on the same screen, and what is on screen twice is not a reading. What is left
 * here is what the reader came to do.
 *
 * The card is `.surface-card` — opaque, one step up from the ground, a hairline drawn as a shadow so
 * that it costs no layout. It was translucent over a 24px backdrop blur until the redesign, which is
 * a thing this screen can no longer be: the plate behind it is an image rather than a match, but the
 * rule that pays for a blur is the same one either way and it is not spent here.
 */
export function UploadView({ state, onFile, onEnter, onClose, onShowAll, isDraggedOver }: Props) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="surface-card relative w-full max-w-[36rem] rounded-float p-8">
        {/* The card transforms in place rather than navigating. The body crossfades on `status`
            alone, so filling in the map and the player count mid-parse does not restart it. Opacity
            and transform only, over a card the size of this one. */}
        <AnimatePresence initial={false} mode="wait">
          <m.div
            key={state.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
            className="flex flex-col gap-4"
          >
            <DemoLibrary
              state={state}
              onFile={onFile}
              onEnter={onEnter}
              onClose={onClose}
              onShowAll={onShowAll}
              isDraggedOver={isDraggedOver}
            />
          </m.div>
        </AnimatePresence>

        <p className="mt-6 text-12 text-ink-dim leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </div>
    </div>
  );
}
