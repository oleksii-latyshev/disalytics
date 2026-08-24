import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { AnimatePresence, m } from '@disa/ui';
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
 * §10.1's upload view: one card, centred, with room around it. Emptiness here is confidence —
 * feature bullets would be the opposite.
 *
 * **It leads with the action rather than with the product name.** §10.1 asks the card for the name
 * and asks the rail's head for it too; the rail is two hundred pixels away on the same screen, and
 * §5.2's lesson from #205 is that what is on screen twice is not a reading. The name is the rail's
 * and the tagline goes with it; what is left here is what the reader came to do.
 */
export function UploadView({ state, onFile, onEnter, onClose, onShowAll, isDraggedOver }: Props) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="relative w-full max-w-[36rem] rounded-float border border-line bg-surface-1 p-8 shadow-raised">
        {/* The card transforms in place rather than navigating — §10.3. The body crossfades on
            `status` alone, so filling in the map and the player count mid-parse does not restart
            it. Opacity and transform only, per §8. */}
        <AnimatePresence initial={false} mode="wait">
          <m.div
            key={state.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
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

        <p className="mt-6 text-12 text-ink-faint leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </div>
    </div>
  );
}
