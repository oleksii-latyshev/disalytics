import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Link } from '@tanstack/react-router';
import { lazy, type ReactNode, Suspense, useMemo, useState } from 'react';
import type { ParseState } from '@/core/parsing';
import { DOCK_SECTIONS, type ShellView } from '../helpers/views';
import { ShellActionsContext } from '../hooks/use-shell-actions';
import { ShellDock } from './ShellDock';

const HelpSheet = lazy(async () => {
  const module = await import('@/features/review');
  return { default: module.HelpSheet };
});
const SettingsSheet = lazy(async () => {
  const module = await import('@/features/review');
  return { default: module.SettingsSheet };
});

interface Props {
  state: Exclude<ParseState, { status: 'ready' }>;
  children: ReactNode;
  isDraggedOver: boolean;
  onClose: () => void;
  /** Present while a new version of the app is waiting; pressing it reloads onto that version. */
  onUpdate: (() => void) | null;
  view: ShellView;
}

type Sheet = 'settings' | 'help';

export function WayIn({ state, children, isDraggedOver, onClose, onUpdate, view }: Props) {
  const t = useT();
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);
  const section = DOCK_SECTIONS.find((entry) => entry.view === view);
  const actions = useMemo(
    () => ({
      openHelp: () => setOpenSheet('help'),
      openSettings: () => setOpenSheet('settings'),
    }),
    [],
  );

  return (
    <ShellActionsContext.Provider value={actions}>
      <div className="relative grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-surface-0">
        {view !== 'home' && (
          <div aria-hidden="true" className="surface-vignette pointer-events-none fixed inset-0" />
        )}

        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-3 z-20 rounded-float border-2 transition-opacity duration-(--duration-micro) ease-out ${
            isDraggedOver ? 'border-ink opacity-100' : 'border-transparent opacity-0'
          }`}
        />

        <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pt-6 wide:px-10 wide:pt-8">
          <Link
            to="/"
            aria-label={t('library.shell.home')}
            onClick={() => {
              if (state.status === 'failed') onClose();
            }}
            className="flex items-center gap-3 rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <img
              src="/logo.svg"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              className="size-12 shrink-0"
            />
            <div>
              <h1 className="flex items-baseline gap-3 font-ui text-20 leading-dense">
                <span className="font-medium">disalytics</span>
                {section !== undefined && (
                  <>
                    <span aria-hidden="true" className="text-ink-faint">
                      /
                    </span>
                    <span className="text-14 font-normal text-ink-dim">
                      <Text path={section.labelPath} />
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-1 text-10 tracking-label text-ink-dim">
                <Text path="library.shell.tagline" />
              </p>
            </div>
          </Link>
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

        <main
          className={`relative min-w-0 overflow-y-auto px-4 pb-28 md:px-6 md:pb-24 wide:px-10 ${view === 'lineups' ? 'pt-2 wide:pt-3' : 'pt-4 wide:pt-6'}`}
        >
          {children}
        </main>

        <ShellDock
          view={view}
          onNavigate={() => {
            if (state.status === 'failed') onClose();
          }}
          onSettingsOpen={() => setOpenSheet('settings')}
          onHelpOpen={() => setOpenSheet('help')}
        />

        <Suspense fallback={null}>
          {openSheet === 'settings' && (
            <SettingsSheet isOpen onDismiss={() => setOpenSheet(null)} />
          )}
          {openSheet === 'help' && <HelpSheet isOpen onDismiss={() => setOpenSheet(null)} />}
        </Suspense>
      </div>
    </ShellActionsContext.Provider>
  );
}
