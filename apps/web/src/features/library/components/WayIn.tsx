import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { lazy, type ReactNode, Suspense, useState } from 'react';
import type { ParseState } from '@/core/parsing';
import type { ShellView } from '../helpers/views';
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
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  return (
    <div className="relative grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-surface-0">
      {view !== 'upload' && (
        <div aria-hidden="true" className="surface-vignette pointer-events-none fixed inset-0" />
      )}

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-3 z-20 rounded-float border-2 transition-opacity duration-(--duration-micro) ease-out ${
          isDraggedOver ? 'border-ink opacity-100' : 'border-transparent opacity-0'
        }`}
      />

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

      <main
        className={`relative min-w-0 overflow-y-auto px-6 pb-24 wide:px-10 ${view === 'lineups' ? 'pt-2 wide:pt-3' : 'pt-4 wide:pt-6'}`}
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
        {openSheet === 'settings' && <SettingsSheet isOpen onDismiss={() => setOpenSheet(null)} />}
        {openSheet === 'help' && <HelpSheet isOpen onDismiss={() => setOpenSheet(null)} />}
      </Suspense>
    </div>
  );
}
