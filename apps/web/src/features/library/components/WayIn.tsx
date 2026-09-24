import { decodeTacticFromHash, type Tactic } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useCallback, useState } from 'react';
import type { ParseState } from '@/core/parsing';
import type { SampleMatch } from '@/core/samples';
import { LineupsView } from '@/features/lineups';
import { HelpSheet, SettingsSheet } from '@/features/review';
import { TacticsView } from '@/features/tactics';
import { ToolsView } from '@/features/tools';
import type { ShellView } from '../helpers/views';
import { useFileDrop } from '../hooks/use-file-drop';
import { LibraryView } from './LibraryView';
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
  /** Present while a new version of the app is waiting; pressing it reloads onto that version. */
  onUpdate: (() => void) | null;
}

/** Settings and help are the way in's too, and they are the review screen's own sheets, not copies. */
type Sheet = 'settings' | 'help';

/** The shell reserves the dock's band in its scroller and ends when a match opens. */
export function WayIn({ state, onFile, onEnter, onSample, onClose, onUpdate }: Props) {
  const [initialSharedTactic, setInitialSharedTactic] = useState<Tactic | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('tactic=')) {
      return decodeTacticFromHash(window.location.hash);
    }
    return null;
  });

  const [view, setView] = useState<ShellView>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('tactic=')) {
      return 'tactics';
    }
    return 'upload';
  });
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
      {/* A new version is offered here and nowhere else. The review screen is not interrupted: a
          reload there drops the reader's place in a match, and the old worker goes on serving the
          old shell whole until they come back to this one. */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pt-6 wide:px-10 wide:pt-8">
        <h1 className="font-ui font-medium text-20 leading-dense">disalytics</h1>
        <div role="status" className="flex items-center gap-3">
          {onUpdate && (
            <>
              <p className="text-13 text-ink-dim">
                <Text path="library.shell.update.ready" />
              </p>
              <Button variant="outline" onClick={onUpdate}>
                <Text path="library.shell.update.reload" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* The band the dock stands in is reserved here rather than drawn here: the dock is fixed, so
          only this padding keeps a scrolled library's last row from sliding under it. */}
      <main className="relative min-w-0 overflow-y-auto px-6 pt-4 pb-24 wide:px-10 wide:pt-6">
        {view === 'upload' && (
          <UploadView
            onEnter={enterMatch}
            onSample={enterSample}
            onLibrary={() => chooseView('library')}
            state={state}
            onFile={openFile}
            onClose={onClose}
            isDraggedOver={isDraggedOver}
          />
        )}
        {view === 'library' && <LibraryView onEnter={enterMatch} onSample={enterSample} />}
        {view === 'tools' && <ToolsView />}
        {view === 'lineups' && <LineupsView />}
        {view === 'tactics' && (
          <TacticsView
            initialTactic={initialSharedTactic}
            onClearInitialTactic={() => {
              setInitialSharedTactic(null);
              if (typeof window !== 'undefined' && window.location.hash.includes('tactic=')) {
                window.history.replaceState(
                  null,
                  '',
                  window.location.pathname + window.location.search,
                );
              }
            }}
          />
        )}
        {view === 'stats' && <SoonView view={view} />}
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
