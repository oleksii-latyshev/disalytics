import type { Tactic } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { TacticEditor } from '@disa/tactic-board';
import { Button } from '@disa/ui';
import { useRef, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import type { EditingTactic } from '../helpers/tactic-editing';
import { useMapLineups } from '../hooks/use-map-lineups';
import { Notice } from './Notice';

/** Re-exported so a new tactic is made from the editor's own lazy chunk, not a second one. */
export { createNewTactic } from '@disa/tactic-board';

/**
 * The shared board editor with what the admin gives it: the site's lineups and a save that writes
 * the one tactic to the site. If someone else saved the tactic meanwhile the save is refused and
 * the page offers to reload it.
 */
export function TacticEditorPanel({
  editing,
  onBack,
  onSaved,
  onReload,
}: {
  editing: EditingTactic;
  onBack: () => void;
  onSaved: () => void;
  onReload: (id: string) => void;
}) {
  const t = useT();
  const { tactic: initial } = editing;
  const basedOn = useRef(editing.basedOn);
  const [isStored, setIsStored] = useState(editing.basedOn !== null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const save = async (tactic: Tactic) => {
    setFailure(null);
    setIsStale(false);
    try {
      await call((client) =>
        client.tactics.save({
          params: { id: tactic.id },
          payload: { tactic, basedOn: basedOn.current },
        }),
      );
      basedOn.current = tactic.updatedAt;
      setIsStored(true);
      onSaved();
    } catch (error) {
      const next = isFailure(error)
        ? error
        : { key: 'admin.error.network' as const, detail: undefined };
      if (next.key === 'admin.error.tacticChanged') setIsStale(true);
      else setFailure(next);
    }
  };

  const back = () => {
    if ((!isStored || isDirty) && !window.confirm(t('admin.tactics.discardConfirm'))) return;
    onBack();
  };

  return (
    <div className="flex flex-col gap-3">
      {isStale ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-card border border-damage/50 bg-surface-2 p-3"
        >
          <p className="text-13 text-ink">
            <Text path="admin.tactics.stale" />
          </p>
          <Button variant="outline" onClick={() => onReload(initial.id)}>
            <Text path="admin.tactics.reload" />
          </Button>
        </div>
      ) : null}
      {failure === null ? null : <Notice failure={failure} />}
      <div className="h-[calc(100dvh-9rem)] min-h-[40rem] overflow-hidden rounded-card border border-line">
        <TacticEditor
          initialTactic={initial}
          useLineups={useMapLineups}
          isStored={isStored}
          onSave={save}
          onBack={back}
          onDirtyChange={setIsDirty}
        />
      </div>
    </div>
  );
}
