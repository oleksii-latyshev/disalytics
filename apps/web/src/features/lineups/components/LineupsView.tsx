import type { Lineup } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapId } from '@disa/map-data';
import { useMemo, useState } from 'react';
import { countsByKind, filterLineups } from '../helpers/lineup-filter';
import { type PointMove, withMove } from '../helpers/lineup-move';
import { clearPick, type LineupPick, NO_PICK, pickTarget } from '../helpers/lineup-pick';
import { NO_SCOPE } from '../helpers/lineup-scope';
import { lineupTargets } from '../helpers/lineup-targets';
import { useAddFlow } from '../hooks/use-add-flow';
import { useBulkSelection } from '../hooks/use-bulk-selection';
import { useEscape } from '../hooks/use-escape';
import { useLineupEdits } from '../hooks/use-lineup-edits';
import { useLineupMapCounts } from '../hooks/use-lineup-map-counts';
import { useMapLineups } from '../hooks/use-map-lineups';
import { LineupFormModal } from './LineupFormModal';
import { LineupPhotoViewer } from './LineupPhotoViewer';
import { LineupsHeader } from './LineupsHeader';
import { LineupsMap } from './LineupsMap';
import { LineupsPanel, panelModeOf } from './LineupsPanel';
import { LineupsSidebar } from './LineupsSidebar';

/**
 * The lineups screen: a map's lineups by where they land, one panel that is whatever the reader is
 * doing, and no mode to find first. A reader picks a target to read how to throw it, edits the
 * position they are looking at, or adds a new one — each begins from a button that says so.
 */
export function LineupsView() {
  const t = useT();
  const [map, setMap] = useState<MapId>('de_mirage');
  const [scope, setScope] = useState(NO_SCOPE);
  const [pick, setPick] = useState<LineupPick>(NO_PICK);
  const [isEditing, setIsEditing] = useState(false);
  const [move, setMove] = useState<PointMove | null>(null);
  const [formLineup, setFormLineup] = useState<Lineup | null>(null);
  const [viewer, setViewer] = useState<{ lineup: Lineup; index: number } | null>(null);

  const { lineups, loading, reload, importLineups, exportLineups } = useMapLineups(map);
  const counts = useLineupMapCounts(map, loading ? null : lineups.length);

  const shown = useMemo(() => withMove(lineups, move), [lineups, move]);
  const criteria = useMemo(
    () => ({ side: scope.side, tag: scope.tag, search: scope.search }),
    [scope.side, scope.tag, scope.search],
  );
  const filtered = useMemo(
    () => filterLineups(shown, { ...criteria, kind: scope.kind }),
    [shown, criteria, scope.kind],
  );
  const kindCounts = useMemo(() => countsByKind(shown, criteria), [shown, criteria]);
  const targets = useMemo(() => lineupTargets(map, filtered), [map, filtered]);

  const selected =
    targets.find((target) => target.id === pick.targetId) ??
    targets.find((target) => target.variants.some(({ id }) => id === pick.variantId)) ??
    null;
  const variant =
    selected?.variants.find(({ id }) => id === pick.variantId) ?? selected?.variants[0] ?? null;
  const isEditingNow = isEditing && variant !== null;

  const edits = useLineupEdits({ map, lineups, reload });
  const add = useAddFlow({
    map,
    reload,
    onSaved: (id) => {
      setScope(NO_SCOPE);
      setPick({ targetId: null, variantId: id, openStack: null });
    },
  });

  const selection = useBulkSelection(targets);
  const { bulk } = selection;

  const letGo = () => {
    setPick(clearPick);
    setIsEditing(false);
    setMove(null);
  };
  const resetScreen = () => {
    letGo();
    add.cancel();
    selection.stopSelecting();
  };

  useEscape(formLineup === null && viewer === null, () => {
    if (add.draft !== null) add.cancel();
    else if (isEditing) setIsEditing(false);
    else letGo();
  });

  const pickId = (id: string) => {
    setIsEditing(false);
    setPick(pickTarget(id));
  };
  const startAdd = () => {
    letGo();
    selection.stopSelecting();
    add.start(scope.kind, scope.side);
  };
  const commit = async (finished: PointMove) => {
    await edits.commitMove(finished);
    setMove(null);
  };
  const confirmRemoval = async (ids: readonly string[], confirm: string) => {
    if (ids.length === 0 || !window.confirm(confirm)) return;
    await edits.remove(ids);
    selection.clear();
    letGo();
  };
  const afterBulk = async (done: Promise<boolean>) => {
    await done;
    selection.clear();
  };

  const mode = panelModeOf(add.draft, selected, variant, isEditing);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
      <LineupsHeader
        map={map}
        counts={counts}
        ownCount={lineups.filter((lineup) => lineup.isBuiltIn !== true).length}
        onMap={(next) => {
          resetScreen();
          setMap(next);
        }}
        onAdd={startAdd}
        onExport={exportLineups}
        onImport={importLineups}
      />

      <div className="grid min-h-[36rem] min-w-0 grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,20rem)] wide:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22.5rem)]">
        <LineupsSidebar
          scope={scope}
          onScope={(next) => {
            letGo();
            setScope(next);
          }}
          kindCounts={kindCounts}
          totalCount={lineups.length}
          targets={targets}
          selectedId={selected?.id ?? null}
          isSelecting={selection.isSelecting}
          checkedIds={selection.checkedIds}
          bulk={bulk}
          onPick={pickId}
          onCheck={selection.toggle}
          onToggleSelecting={selection.toggleSelecting}
          onClearChecked={selection.clear}
          onMergeLandings={() => void afterBulk(edits.merge(bulk.lineups, 'landing'))}
          onMergeOrigins={() => void afterBulk(edits.merge(bulk.lineups, 'origin'))}
          onUngroup={() => void afterBulk(edits.ungroup(new Set(bulk.lineups.map(({ id }) => id))))}
          onDelete={() =>
            void confirmRemoval(
              bulk.deletable.map(({ id }) => id),
              t('library.lineups.deleteSelectedConfirm', { count: bulk.deletable.length }),
            )
          }
        />

        <LineupsMap
          key={map}
          map={map}
          targets={targets}
          selected={selected}
          activeVariantId={variant?.id ?? null}
          openStack={pick.openStack}
          draft={add.draft}
          editing={isEditingNow ? variant.lineup : null}
          onSelectTarget={pickId}
          onSelectVariant={(id) => setPick((current) => ({ ...current, variantId: id }))}
          onOpenStack={(id) => setPick((current) => ({ ...current, openStack: id }))}
          onClear={letGo}
          onPlace={add.place}
          onCancelAdd={add.cancel}
          onMove={setMove}
          onCommit={(finished) => void commit(finished)}
        />

        <LineupsPanel
          map={map}
          mode={mode}
          targets={targets}
          isSaving={add.isSaving}
          hasFailed={add.hasFailed}
          actions={{
            onPick: pickId,
            onVariant: (id) => setPick((current) => ({ ...current, variantId: id })),
            onClose: letGo,
            onAdd: startAdd,
            onEdit: () => setIsEditing(true),
            onAnother: () => {
              if (selected === null || variant === null) return;
              setIsEditing(false);
              add.startAnother(selected, variant.lineup.side);
            },
            onOpenPhoto: (index) => {
              if (variant !== null) setViewer({ lineup: variant.lineup, index });
            },
            onDone: () => setIsEditing(false),
            onDetails: setFormLineup,
            onAddBounce: (lineup) => void edits.addBounce(lineup),
            onRemoveBounce: (lineup, index) => void edits.removeBounce(lineup, index),
            onUngroup: (lineup) => void edits.ungroup(new Set([lineup.id])),
            onDelete: (lineup) =>
              void confirmRemoval([lineup.id], t('library.lineups.deleteConfirm')),
            onDraft: add.update,
            onRedo: add.redo,
            onSave: (photos) => void add.save(photos),
            onCancelAdd: add.cancel,
          }}
        />
      </div>

      {formLineup !== null && (
        <LineupFormModal
          isOpen
          onDismiss={() => setFormLineup(null)}
          initialData={formLineup}
          defaultMap={map}
          onSaved={() => void reload()}
        />
      )}

      {viewer !== null && (
        <LineupPhotoViewer
          lineup={viewer.lineup}
          index={viewer.index}
          onDismiss={() => setViewer(null)}
        />
      )}
    </div>
  );
}
