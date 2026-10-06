import type { Tactic } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, cn, Dialog } from '@disa/ui';
import { Info, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { useTacticTransfer } from '../hooks/use-tactic-transfer';
import { TacticExportPanel } from './TacticExportPanel';
import { TacticImportPanel } from './TacticImportPanel';

const TABS = ['export', 'import'] as const;
type Tab = (typeof TABS)[number];

export interface TacticTransferDialogProps {
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  /** The tactic being edited, so it can be exported alone; null from the library list. */
  readonly tactic?: Tactic | null | undefined;
  /** Called after tactics were imported, so a list behind the dialog can refresh. */
  readonly onImported?: (() => void) | undefined;
}

/**
 * The one place tactics cross a browser's edge: a file out, a file in. Tactics live in this
 * browser, so a file is a copy and a tactic that clashes by id asks which version to keep.
 */
export function TacticTransferDialog({
  isOpen,
  onDismiss,
  tactic = null,
  onImported,
}: TacticTransferDialogProps) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('export');
  const { library, readLibrary, write } = useTacticTransfer(isOpen);

  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setTab((current) => (current === 'export' ? 'import' : 'export'));
  };

  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={onDismiss}
      aria-label={t('library.tactics.transfer.title')}
      data-shortcuts-suspended
      className="flex w-[min(92vw,37.5rem)] flex-col gap-3.5 p-5"
    >
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 font-semibold text-20 text-ink">
          <Text path="library.tactics.transfer.title" />
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={onDismiss}
          aria-label={t('library.tactics.transfer.close')}
          title={t('library.tactics.transfer.close')}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div
        role="tablist"
        aria-label={t('library.tactics.transfer.tabsLabel')}
        className="grid grid-cols-2 gap-0.5 rounded-card bg-surface-2 p-1"
      >
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tactic-transfer-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="tactic-transfer-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={move}
            className={cn(
              'h-control-lg cursor-pointer rounded-chip font-medium text-13 transition-colors duration-(--duration-micro) ease-out',
              tab === id ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink',
            )}
          >
            <Text
              path={
                id === 'export'
                  ? 'library.tactics.transfer.tabExport'
                  : 'library.tactics.transfer.tabImport'
              }
            />
          </button>
        ))}
      </div>

      <div
        id="tactic-transfer-panel"
        role="tabpanel"
        aria-labelledby={`tactic-transfer-tab-${tab}`}
      >
        {tab === 'export' ? (
          <TacticExportPanel tactic={tactic} library={library} />
        ) : (
          <TacticImportPanel
            readLibrary={readLibrary}
            write={write}
            onImported={() => onImported?.()}
            onClose={onDismiss}
          />
        )}
      </div>

      <p className="flex items-start gap-2 rounded-card bg-surface-2 px-3 py-2.5 text-12 text-ink-dim leading-prose">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 flex-none" />
        <Text path="library.tactics.transfer.footer" />
      </p>
    </Dialog>
  );
}
