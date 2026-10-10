import type { Lineup } from '@disa/demo-core';
import { TacticEditor, type TacticEditorProps } from '@disa/tactic-board';
import { useLineupCatalog } from '@/core/lineup-catalog';
import { replacementFor } from '../helpers/tactic-transfer';
import { useTacticStored } from '../hooks/use-tactic-stored';
import { TacticTransferDialog } from './TacticTransferDialog';

function useCatalogLineups(map: string): readonly Lineup[] {
  return useLineupCatalog(map).lineups;
}

type TacticEditorScreenProps = Omit<
  TacticEditorProps,
  'useLineups' | 'isStored' | 'renderTransfer'
>;

/** The shared tactic editor with what this browser gives it: its lineups, its store, its files. */
export function TacticEditorScreen(props: TacticEditorScreenProps) {
  const isStored = useTacticStored(props.initialTactic.id);

  return (
    <TacticEditor
      {...props}
      useLineups={useCatalogLineups}
      isStored={isStored}
      renderTransfer={({ isOpen, onDismiss, tactic, onReplaced }) => (
        <TacticTransferDialog
          isOpen={isOpen}
          onDismiss={onDismiss}
          tactic={tactic}
          onImported={(written) => {
            const imported = replacementFor(written, tactic.id);
            if (imported !== null) onReplaced(imported);
          }}
        />
      )}
    />
  );
}
