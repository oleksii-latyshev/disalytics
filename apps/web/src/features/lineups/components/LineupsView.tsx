import type { Lineup, LineupCollection } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapId } from '@disa/map-data';
import { useMemo, useState } from 'react';
import { memberLineupIds } from '../helpers/lineup-collection-membership';
import {
  readCollectionPreference,
  writeCollectionPreference,
} from '../helpers/lineup-collection-pref';
import { countsByKind, filterLineups } from '../helpers/lineup-filter';
import { type PointMove, withMove } from '../helpers/lineup-move';
import { clearPick, type LineupPick, NO_PICK, pickTarget } from '../helpers/lineup-pick';
import { NO_SCOPE } from '../helpers/lineup-scope';
import { lineupTargets } from '../helpers/lineup-targets';
import { useAddFlow } from '../hooks/use-add-flow';
import { useBulkSelection } from '../hooks/use-bulk-selection';
import { useEscape } from '../hooks/use-escape';
import { useLineupCollections } from '../hooks/use-lineup-collections';
import { useLineupEdits } from '../hooks/use-lineup-edits';
import { useLineupMapCounts } from '../hooks/use-lineup-map-counts';
import { useMapLineups } from '../hooks/use-map-lineups';
import { LineupConfirmDialog } from './LineupConfirmDialog';
import { LineupFormModal } from './LineupFormModal';
import { LineupPositionDialog } from './LineupPositionDialog';
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
  const [removal, setRemoval] = useState<{ ids: readonly string[]; message: string } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(() =>
    readCollectionPreference('de_mirage'),
  );
  const [collectionRemoval, setCollectionRemoval] = useState<LineupCollection | null>(null);

  const { lineups, loading, reload, importLineups, exportLineups } = useMapLineups(map);
  const counts = useLineupMapCounts(map, loading ? null : lineups.length);
  const knownIds = useMemo(() => new Set(lineups.map(({ id }) => id)), [lineups]);
  const collectionsApi = useLineupCollections({ map, knownIds, isLineupsLoading: loading });
  const { collections } = collectionsApi;
  const activeCollection = collections.find(({ id }) => id === collectionId) ?? null;
  const members = useMemo(() => {
    if (activeCollection !== null) return new Set(memberLineupIds(activeCollection, knownIds));
    return collectionId !== null && collectionsApi.isLoading ? new Set<string>() : null;
  }, [activeCollection, collectionId, collectionsApi.isLoading, knownIds]);
  const collectionCounts = useMemo(
    () =>
      new Map(
        collections.map((item) => [item.id, memberLineupIds(item, knownIds).length] as const),
      ),
    [collections, knownIds],
  );

  const shown = useMemo(() => withMove(lineups, move), [lineups, move]);
  const criteria = useMemo(
    () => ({ side: scope.side, tag: scope.tag, search: scope.search, members }),
    [scope.side, scope.tag, scope.search, members],
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
    setIsDialogOpen(false);
    setHoveredId(null);
    setPick(clearPick);
    setIsEditing(false);
    setMove(null);
  };
  const resetScreen = () => {
    letGo();
    add.cancel();
    selection.stopSelecting();
  };

  useEscape(formLineup === null && !isDialogOpen && removal === null, () => {
    if (add.draft !== null) add.cancel();
    else if (isEditing) setIsEditing(false);
    else letGo();
  });

  const pickId = (id: string) => {
    setIsEditing(false);
    setPick(pickTarget(id));
  };
  const pickVariant = (id: string) => setPick((current) => ({ ...current, variantId: id }));
  const openVariant = (id: string) => {
    pickVariant(id);
    setHoveredId(null);
    setIsDialogOpen(true);
  };
  const editFromDialog = () => {
    setIsDialogOpen(false);
    setIsEditing(true);
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
  const askRemoval = (ids: readonly string[], message: string) => {
    if (ids.length > 0) setRemoval({ ids, message });
  };
  const removeConfirmed = async (ids: readonly string[]) => {
    setRemoval(null);
    await edits.remove(ids);
    selection.clear();
    letGo();
  };
  const afterBulk = async (done: Promise<boolean>) => {
    await done;
    selection.clear();
  };

  const selectCollection = (id: string | null) => {
    letGo();
    selection.clear();
    setCollectionId(id);
    writeCollectionPreference(map, id);
  };
  const createCollection = (name: string, ids: readonly string[]) =>
    collectionsApi.create(name, ids);
  const removeCollectionConfirmed = async (collection: LineupCollection) => {
    setCollectionRemoval(null);
    if (!(await collectionsApi.remove(collection.id))) return;
    if (collection.id === collectionId) selectCollection(null);
  };
  const importWithCollections = async (file: File) => {
    const result = await importLineups(file);
    await collectionsApi.reload();
    return result;
  };

  const mode = panelModeOf(add.draft, selected, variant, isEditing);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
      <LineupsHeader
        map={map}
        counts={counts}
        ownCount={lineups.filter((lineup) => lineup.isBuiltIn !== true).length}
        collectionCount={collections.length}
        onMap={(next) => {
          resetScreen();
          setCollectionId(readCollectionPreference(next));
          setMap(next);
        }}
        onAdd={startAdd}
        onExport={exportLineups}
        onImport={importWithCollections}
      />

      <div className="grid min-h-[36rem] min-w-0 grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,14.5rem)_minmax(0,1fr)_minmax(0,16rem)] wide:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,22rem)]">
        <LineupsSidebar
          collections={{
            collections,
            counts: collectionCounts,
            activeId: activeCollection?.id ?? null,
            onSelect: selectCollection,
            onCreate: (name) =>
              void createCollection(name, []).then((id) => {
                if (id !== null) selectCollection(id);
              }),
            onRename: (id, name) => void collectionsApi.rename(id, name),
            onDelete: setCollectionRemoval,
            onToggleMembers: (id, ids) =>
              void collectionsApi.toggleMembers(id, ids).then(selection.clear),
            onCreateWith: (name, ids) => void createCollection(name, ids).then(selection.clear),
          }}
          scope={scope}
          onScope={(next) => {
            letGo();
            setScope(next);
          }}
          kindCounts={kindCounts}
          totalCount={members?.size ?? lineups.length}
          mapCount={lineups.length}
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
          onUngroupLandings={() =>
            void afterBulk(edits.ungroup(new Set(bulk.lineups.map(({ id }) => id)), 'landing'))
          }
          onUngroupOrigins={() =>
            void afterBulk(edits.ungroup(new Set(bulk.lineups.map(({ id }) => id)), 'origin'))
          }
          onDelete={() =>
            askRemoval(
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
          hoveredVariantId={hoveredId}
          onHoverVariant={setHoveredId}
          onSelectTarget={pickId}
          onOpenVariant={openVariant}
          onSelectVariant={pickVariant}
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
          collections={collections}
          isSaving={add.isSaving}
          hasFailed={add.hasFailed}
          hoveredVariantId={hoveredId}
          actions={{
            onPick: pickId,
            onHoverVariant: setHoveredId,
            onOpenVariant: openVariant,
            onClose: letGo,
            onAdd: startAdd,
            onEdit: () => setIsEditing(true),
            onAnother: () => {
              if (selected === null || variant === null) return;
              setIsEditing(false);
              add.startAnother(selected, variant.lineup.side);
            },
            onDone: () => setIsEditing(false),
            onDetails: setFormLineup,
            onAddBounce: (lineup) => void edits.addBounce(lineup),
            onRemoveBounce: (lineup, index) => void edits.removeBounce(lineup, index),
            onMergeOrigins: (positions) => void edits.merge(positions, 'origin'),
            onUngroup: (lineup, groupTarget) =>
              void edits.ungroup(new Set([lineup.id]), groupTarget),
            onDelete: (lineup) => askRemoval([lineup.id], t('library.lineups.deleteConfirm')),
            onDraft: add.update,
            onRedo: add.redo,
            onSave: (photos) => void add.save(photos),
            onCancelAdd: add.cancel,
            onToggleCollection: (id, ids) => void collectionsApi.toggleMembers(id, ids),
            onCreateCollection: (name, ids) => void createCollection(name, ids),
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

      {removal !== null && (
        <LineupConfirmDialog
          message={removal.message}
          confirmLabel={t('library.lineups.confirm.delete')}
          cancelLabel={t('library.lineups.form.cancel')}
          isDestructive
          onConfirm={() => void removeConfirmed(removal.ids)}
          onCancel={() => setRemoval(null)}
        />
      )}

      {collectionRemoval !== null && (
        <LineupConfirmDialog
          message={t('library.lineups.collections.deleteConfirm', { name: collectionRemoval.name })}
          confirmLabel={t('library.lineups.confirm.delete')}
          cancelLabel={t('library.lineups.form.cancel')}
          isDestructive
          onConfirm={() => void removeCollectionConfirmed(collectionRemoval)}
          onCancel={() => setCollectionRemoval(null)}
        />
      )}

      {isDialogOpen && selected !== null && variant !== null && (
        <LineupPositionDialog
          map={map}
          target={selected}
          variant={variant}
          onVariant={pickVariant}
          onEdit={editFromDialog}
          onDismiss={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}
