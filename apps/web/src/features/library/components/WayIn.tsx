import { Text } from '@disa/i18n';
import { AnimatePresence, m } from '@disa/ui';
import type { ParseState } from '@/core/parsing';
import { useFileDrop } from '../hooks/use-file-drop';
import { DemoLibrary } from './DemoLibrary';
import { PlateBackdrop } from './PlateBackdrop';

interface Props {
  // An opened demo is the review screen's, so it never reaches here.
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onClose: () => void;
}

/**
 * The way in — DESIGN.md §5. One card over the product's own material, and the drop target is the
 * whole viewport rather than a box inside it: `useFileDrop` already listens on the window, so what
 * this adds is the screen *acknowledging* the drag instead of a dashed rectangle doing it alone.
 */
export function WayIn({ state, onFile, onClose }: Props) {
  const isDraggedOver = useFileDrop(onFile);

  return (
    <div className="app-shell relative grid place-items-center overflow-hidden p-8">
      <PlateBackdrop isLifted={isDraggedOver} />

      {/* The acknowledgement is the screen's, not the card's. Accent rather than focus white: §2
          gives the accent to this screen precisely because it carries no side data. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-3 rounded-float border-2 transition-opacity duration-(--duration-micro) ease-out ${
          isDraggedOver ? 'border-accent opacity-100' : 'border-transparent opacity-0'
        }`}
      />

      <main className="relative w-full max-w-[36rem] rounded-float border border-line bg-surface-1 p-8 shadow-raised">
        <header className="flex flex-col gap-2">
          {/* The product name is a name, not copy — DESIGN.md §11 keeps this kind of vocabulary out
              of the message catalogue in both locales. */}
          <h1 className="font-ui text-28 leading-dense">disalytics</h1>
          <p className="text-13 text-ink-dim leading-prose">
            <Text path="common.tagline" />
          </p>
        </header>

        {/* The card transforms in place rather than navigating — §5. The body crossfades on
            `status` alone, so filling in the map and the player count mid-parse does not restart
            it. Opacity and transform only, per §8. */}
        <AnimatePresence initial={false} mode="wait">
          <m.div
            key={state.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="mt-6 flex flex-col gap-4"
          >
            <DemoLibrary
              state={state}
              onFile={onFile}
              onClose={onClose}
              isDraggedOver={isDraggedOver}
            />
          </m.div>
        </AnimatePresence>

        <p className="mt-6 text-12 text-ink-faint leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </main>
    </div>
  );
}
