import type { SavedDemo } from '@disa/demo-store';
import { useCallback, useState } from 'react';
import type { ParseState } from '@/core/parsing';
import type { SampleMatch } from '@/core/samples';
import { HelpSheet, SettingsSheet } from '@/features/review';
import type { ShellView } from '../helpers/views';
import { useFileDrop } from '../hooks/use-file-drop';
import { LibraryView } from './LibraryView';
import { PixelBackdrop } from './PixelBackdrop';
import { ShellDock } from './ShellDock';
import { SoonView } from './SoonView';
import { UploadView } from './UploadView';

interface Props {
  // An opened demo is the review screen's, so it never reaches here.
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
  onClose: () => void;
}

/** Settings and help are the way in's too, and they are the review screen's own sheets, not copies. */
type Sheet = 'settings' | 'help';

/**
 * The way in. A shell with the whole viewport for its content, a dock along the bottom, and a drop
 * target that is the viewport rather than a box inside it: `useFileDrop` already listens on the
 * window, so what this adds is the screen *acknowledging* the drag instead of a dashed rectangle
 * doing it alone.
 *
 * The ground under all of it is `PixelBackdrop` since #332 — Dust2's own plate taken apart into a
 * grid, and the one place in the product where a hue means nothing a demo said, because this is the
 * screen with no demo on it.
 *
 * **It is three rows and the dock is in none of them.** `ShellDock` is fixed to the viewport's
 * bottom edge, and what reserves its band is `main`'s own bottom padding — which is why the shell is
 * `h-dvh` at every width and `main` is the scroller. It used to be the document that scrolled below
 * `--breakpoint-split`, and a fixed panel over a document scroller is the one arrangement where the
 * reader can reach the end of a library and find the last row underneath it.
 *
 * **The shell ends where the match begins.** `App` swaps it for the review screen entirely, and the
 * reason is the plate rather than a preference: the plate is `min(100cqi, 100cqb)` of the cell the
 * stage leaves it, so neither a rail nor a dock is chrome beside it — each is a subtraction from one
 * of the plate's own axes, and three of the four widths this repository quotes a plate figure at are
 * height-bound.
 */
export function WayIn({ state, onFile, onEnter, onSample, onClose }: Props) {
  const [view, setView] = useState<ShellView>('upload');
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  // An open lands the reader on the upload view wherever they were, because that is the view that
  // reports it. It is a move made once, at the moment they ask for it, rather than a rule
  // that holds them there: a parse they started is not a screen they cannot leave, and a failure is
  // terminal, so a rule keyed on "not idle" would strand them on it with nothing to press.
  const openFile = useCallback(
    (file: File) => {
      setView('upload');
      onFile(file);
    },
    [onFile],
  );

  const enterMatch = useCallback(
    (demo: SavedDemo, roundIndex: number) => {
      setView('upload');
      onEnter(demo, roundIndex);
    },
    [onEnter],
  );

  // The same move a file makes, for the same reason: the upload view is where a download reports
  // itself, and the library has nowhere to put a progress reading.
  const enterSample = useCallback(
    (sample: SampleMatch) => {
      setView('upload');
      onSample(sample);
    },
    [onSample],
  );

  // A failure belongs to the screen that raised it. Leaving ends it rather than parking it behind
  // the dock to reappear on the way back; a parse still running is left alone, because `close`
  // terminates the worker and navigating away is not cancelling.
  const chooseView = useCallback(
    (next: ShellView) => {
      if (state.status === 'failed') onClose();
      setView(next);
    },
    [state.status, onClose],
  );

  const isDraggedOver = useFileDrop(openFile);

  return (
    <div className="relative grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-surface-0">
      {/* The field is the way in's own screen and nobody else's. The library and the two screens
          that are coming are pages of text, and they stand on the app's ground with one light over
          it — which is the whole of their decoration. */}
      <PixelBackdrop isLifted={isDraggedOver} isShown={view === 'upload'} />

      {view !== 'upload' && (
        <div aria-hidden="true" className="surface-vignette pointer-events-none fixed inset-0" />
      )}

      {/* The acknowledgement is the screen's, not the card's. It is white, like every other thing
          in the product that is the interface talking rather than the demo — there is no accent hue
          left to reach for, and on a screen with no side data on it there is nothing white could be
          confused with. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-3 z-20 rounded-float border-2 transition-opacity duration-(--duration-micro) ease-out ${
          isDraggedOver ? 'border-ink opacity-100' : 'border-transparent opacity-0'
        }`}
      />

      {/* The product name's home now that the rail is gone. It is a name and not copy — AGENTS.md
          §11 keeps this kind of vocabulary out of the message catalogue in both locales — and it
          stays at the top left, where it was, rather than joining the dock: a wordmark is not a
          control, and six squares in a 52px panel is not a place to read one. */}
      <header className="relative z-10 px-6 pt-6 wide:px-10 wide:pt-8">
        <h1 className="font-ui font-medium text-20 leading-dense">disalytics</h1>
      </header>

      {/* The band the dock stands in is reserved here rather than drawn here: the dock is fixed, so
          only this padding keeps a scrolled library's last row from sliding under it. */}
      <main className="relative min-w-0 overflow-y-auto px-6 pt-4 pb-24 wide:px-10 wide:pt-6">
        {view === 'upload' && (
          <UploadView
            state={state}
            onFile={openFile}
            onEnter={enterMatch}
            onClose={onClose}
            onShowAll={() => setView('library')}
            isDraggedOver={isDraggedOver}
          />
        )}
        {view === 'library' && <LibraryView onEnter={enterMatch} onSample={enterSample} />}
        {(view === 'lineups' || view === 'stats') && <SoonView view={view} />}
      </main>

      <ShellDock
        view={view}
        onView={chooseView}
        onSettingsOpen={() => setOpenSheet('settings')}
        onHelpOpen={() => setOpenSheet('help')}
      />

      <SettingsSheet isOpen={openSheet === 'settings'} onDismiss={() => setOpenSheet(null)} />
      <HelpSheet isOpen={openSheet === 'help'} onDismiss={() => setOpenSheet(null)} />
    </div>
  );
}
