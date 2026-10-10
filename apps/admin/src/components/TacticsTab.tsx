import type { SiteTacticsResponse } from '@disa/admin-contract';
import { isTactic, type Tactic, type TacticSide } from '@disa/demo-core';
import { lazy, Suspense, useState } from 'react';
import { call } from '../api/client';
import { type EditingTactic, editingFromSite, editingNew } from '../helpers/tactic-editing';
import { forgetMapLineups } from '../hooks/use-map-lineups';
import type { Resource } from '../hooks/use-resource';
import { SiteTactics } from './SiteTactics';
import { TacticsSection } from './TacticsSection';

const TacticEditorPanel = lazy(() =>
  import('./TacticEditorPanel').then((module) => ({ default: module.TacticEditorPanel })),
);

async function newTactic(map: string, side: TacticSide): Promise<Tactic> {
  const { createNewTactic } = await import('./TacticEditorPanel');
  return createNewTactic(map, side);
}

/**
 * The Tactics tab: the file import and the site's tactics, or, while one is being edited, the
 * board editor in their place at full width.
 */
export function TacticsTab({
  resource,
  onChanged,
  onRetry,
}: {
  resource: Resource<SiteTacticsResponse>;
  onChanged: () => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState<EditingTactic | null>(null);
  const [opened, setOpened] = useState(0);

  const open = (next: (key: number) => EditingTactic) => {
    forgetMapLineups();
    setOpened(opened + 1);
    setEditing(next(opened + 1));
  };

  /** The stored version of a tactic, read again, after someone else saved it. */
  const reload = async (id: string) => {
    const { tactics } = await call((client) => client.tactics.list());
    const found = tactics.filter(isTactic).find((entry) => entry.id === id);
    onChanged();
    if (found === undefined) {
      setEditing(null);
      return;
    }
    open((key) => editingFromSite(key, found));
  };

  if (editing !== null) {
    return (
      <Suspense fallback={null}>
        <TacticEditorPanel
          key={editing.key}
          editing={editing}
          onBack={() => setEditing(null)}
          onSaved={onChanged}
          onReload={(id) => void reload(id)}
        />
      </Suspense>
    );
  }

  return (
    <>
      <TacticsSection onChanged={onChanged} />
      <SiteTactics
        resource={resource}
        onChanged={onChanged}
        onRetry={onRetry}
        onEdit={(tactic) => open((key) => editingFromSite(key, tactic))}
        onCreate={(map, side) =>
          void newTactic(map, side).then((tactic) => open((key) => editingNew(key, tactic)))
        }
      />
    </>
  );
}
