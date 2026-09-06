import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { AnimatePresence, DURATION_BASE_SECONDS, EASE_OUT, motion } from '@disa/ui';
import type { ParseState } from '@/core/parsing';
import { DemoLibrary } from './DemoLibrary';

interface Props {
  // An opened demo is the workspace's screen rather than the library's, so it never reaches here.
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onClose: () => void;
  onShowAll: () => void;
  isDraggedOver: boolean;
}

/**
 * The way in: the promise, then the one thing to do about it.
 *
 * **The hero stands on the background rather than inside the card**, and the card holds the action
 * alone. It is the product's own sentence at `text-44` — §3's one-per-screen size, which the review
 * screen gave up in #205 — and it is here rather than in the rail because it was in both, which is
 * #205's own lesson about a reading that appears twice.
 *
 * It does **not** move with the state. Only the card's body crossfades on `status`, so a parse that
 * fills in the map and the player count mid-flight does not restart the sentence above it — and a
 * failure replaces the card without the screen losing what the product is.
 *
 * The card is `.surface-card` — opaque, one step up from the ground, its hairline drawn as a shadow
 * so it costs no layout. Opaque matters more here than it did over the plate: what is behind it is a
 * moving gradient, and a translucent card would make every reading on it a function of which band
 * happens to be under it.
 */
export function UploadView({ state, onFile, onEnter, onClose, onShowAll, isDraggedOver }: Props) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 py-8">
      <h2 className="max-w-[22ch] text-balance text-center font-ui font-medium text-44 leading-tight">
        <Text path="common.tagline" />
      </h2>

      <div className="surface-card relative w-full max-w-[36rem] rounded-float p-8">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
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
          </motion.div>
        </AnimatePresence>

        <p className="mt-6 text-12 text-ink-dim leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </div>
    </div>
  );
}
