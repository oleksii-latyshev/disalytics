import type { SavedDemo } from '@disa/demo-store';
import { useCallback, useState } from 'react';
import type { ParseState } from '@/core/parsing';
import { HelpSheet, SettingsSheet } from '@/features/review';
import type { RailView } from '../helpers/views';
import { useFileDrop } from '../hooks/use-file-drop';
import { LibraryView } from './LibraryView';
import { PlateBackdrop } from './PlateBackdrop';
import { SideRail } from './SideRail';
import { SoonView } from './SoonView';
import { UploadView } from './UploadView';

interface Props {
  // An opened demo is the review screen's, so it never reaches here.
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onClose: () => void;
}

/** Settings and help are the way in's too, and they are §10.5's and §10.6's own sheets, not copies. */
type Sheet = 'settings' | 'help';

/**
 * The way in — DESIGN.md §10.1. A shell with a persistent rail and one view inside it, and the drop
 * target is the whole viewport rather than a box inside it: `useFileDrop` already listens on the
 * window, so what this adds is the screen *acknowledging* the drag instead of a dashed rectangle
 * doing it alone.
 *
 * **The shell ends where the match begins.** `App` swaps it for the review screen entirely, and
 * §5.1 is the reason rather than a preference: the plate is `min(100cqi, 100cqb)` of the cell the
 * stage leaves it, so a rail is not chrome beside the plate — it is a subtraction from the plate's
 * own axis, and 280px of it is nearly half the 616px the plate measures at 1280.
 */
export function WayIn({ state, onFile, onEnter, onClose }: Props) {
  const [view, setView] = useState<RailView>('upload');
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  // An open lands the reader on the upload view wherever they were, because that is the view that
  // reports it — §10.3. It is a move made once, at the moment they ask for it, rather than a rule
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

  // A failure belongs to the screen that raised it. Leaving ends it rather than parking it behind
  // the rail to reappear on the way back; a parse still running is left alone, because `close`
  // terminates the worker and navigating away is not cancelling.
  const chooseView = useCallback(
    (next: RailView) => {
      if (state.status === 'failed') onClose();
      setView(next);
    },
    [state.status, onClose],
  );

  const isDraggedOver = useFileDrop(openFile);

  return (
    <div className="app-shell relative grid grid-rows-[auto_minmax(0,1fr)] bg-surface-0 split:h-dvh split:grid-cols-[17.5rem_minmax(0,1fr)] split:grid-rows-1">
      <PlateBackdrop isLifted={isDraggedOver} />

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

      <SideRail
        view={view}
        onView={chooseView}
        onSettingsOpen={() => setOpenSheet('settings')}
        onHelpOpen={() => setOpenSheet('help')}
      />

      <main className="relative min-w-0 overflow-y-auto p-6 wide:p-10">
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
        {view === 'library' && <LibraryView onEnter={enterMatch} />}
        {(view === 'lineups' || view === 'stats') && <SoonView view={view} />}
      </main>

      <SettingsSheet isOpen={openSheet === 'settings'} onDismiss={() => setOpenSheet(null)} />
      <HelpSheet isOpen={openSheet === 'help'} onDismiss={() => setOpenSheet(null)} />
    </div>
  );
}
