import type { Lineup, UtilityKind } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapId } from '@disa/map-data';
import { useRef, useState } from 'react';
import type { SelectedLineupNode } from '../helpers/lineup-layer';
import { useLineupGroupActions } from '../hooks/use-lineup-group-actions';
import { useLineupImport } from '../hooks/use-lineup-import';
import { useLineupPlacement } from '../hooks/use-lineup-placement';
import { type LineupPoint, useLineupPointActions } from '../hooks/use-lineup-point-actions';
import {
  createLineupSelectionActions,
  type InteractionMode,
  type SelectedVariants,
} from '../hooks/use-lineup-selection';
import { useLineupViewData } from '../hooks/use-lineup-view-data';
import { useMapLineups } from '../hooks/use-map-lineups';
import { LineupPlate } from './LineupPlate';
import { LineupsFilterSidebar } from './LineupsFilterSidebar';
import { LineupsHeader } from './LineupsHeader';
import { LineupsListSidebar } from './LineupsListSidebar';
import { LineupsRecordDialogs } from './LineupsRecordDialogs';
import { LineupVariantsDialog } from './LineupVariantsDialog';

type SideScope = 'ALL' | 'CT' | 'T';
type KindScope = 'all' | UtilityKind;
type Point = LineupPoint;

export function LineupsView() {
  const t = useT();
  const [mode, setMode] = useState<InteractionMode>('view');
  const [map, setMap] = useState<MapId>('de_mirage');
  const [side, setSide] = useState<SideScope>('ALL');
  const [kind, setKind] = useState<KindScope>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<readonly SelectedLineupNode[]>([]);
  const [editGrenadeKind, setEditGrenadeKind] = useState<UtilityKind>('smoke');
  const [origin, setOrigin] = useState<Point | null>(null);
  const [draftWaypoints, setDraftWaypoints] = useState<Point[]>([]);
  const [isAddingBounce, setIsAddingBounce] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [editingLineup, setEditingLineup] = useState<Lineup | null>(null);
  const [detailLineup, setDetailLineup] = useState<Lineup | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftLanding, setDraftLanding] = useState<Point | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariants | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lineups, reload, deleteLineup, importLineups, exportLineups } = useMapLineups(map);

  const {
    filteredLineups,
    selectedIndex,
    hoveredIndex,
    originGroups,
    landingGroups,
    selectedGroup,
    selectedNodes: visibleSelectedNodes,
    selectedLineupIds,
    mergeTarget,
  } = useLineupViewData({
    lineups,
    side,
    kind,
    search,
    selectedId,
    hoveredId,
    selectedIds,
    selectedNodes,
    selectedVariants,
  });
  const { handleToggleSelectId, handleClearSelection, handleSelectMarker, handleSelectNode } =
    createLineupSelectionActions({
      mode,
      filteredLineups,
      originGroups,
      landingGroups,
      selectedIds,
      selectedNodes,
      setSelectedId,
      setSelectedIds,
      setSelectedNodes,
      setSelectedVariants,
      setDetailLineup,
    });
  const {
    handleMergeLandings,
    handleMergeOrigins,
    handleMergeSelected,
    handleDeleteSelected,
    handleUnmergeLineup,
    handleUnmergeSelected,
  } = useLineupGroupActions({
    lineups,
    filteredLineups,
    selectedIds: selectedLineupIds,
    mergeTarget,
    setSelectedIds,
    setSelectedNodes,
    setSelectedId,
    setNotice,
    reload,
    deleteLineup,
  });
  const { handleUpdateLineupPoint, handleAddBounceToLineup, handleDeleteBounceFromLineup } =
    useLineupPointActions({
      lineups,
      map,
      reload,
      setNotice,
      setSelectedId,
      setSelectedNodes,
    });

  const { handlePlacePoint, handleCancelPlacement, dismissForm } = useLineupPlacement({
    origin,
    setOrigin,
    setDraftWaypoints,
    setIsAddingBounce,
    setIsPlacing,
    setDraftLanding,
    setIsModalOpen,
    setEditingLineup,
  });

  const handleFileChange = useLineupImport(importLineups, setNotice);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
      <LineupsHeader
        mode={mode}
        count={filteredLineups.length}
        setMode={setMode}
        setIsPlacing={setIsPlacing}
        setOrigin={setOrigin}
        setDraftWaypoints={setDraftWaypoints}
        setIsAddingBounce={setIsAddingBounce}
        setIsModalOpen={setIsModalOpen}
        setSelectedId={setSelectedId}
        setSelectedNodes={setSelectedNodes}
        setNotice={setNotice}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        exportLineups={exportLineups}
      />

      <div className="relative grid min-h-[36rem] min-w-0 grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(11rem,13rem)_minmax(0,1fr)_minmax(16rem,20rem)] xl:block">
        <LineupsFilterSidebar
          map={map}
          setMap={setMap}
          side={side}
          setSide={setSide}
          kind={kind}
          setKind={setKind}
          mode={mode}
          editGrenadeKind={editGrenadeKind}
          setEditGrenadeKind={setEditGrenadeKind}
          setSelectedId={setSelectedId}
          setSelectedIds={setSelectedIds}
          setSelectedNodes={setSelectedNodes}
          setHoveredId={setHoveredId}
          setOrigin={setOrigin}
          setDraftWaypoints={setDraftWaypoints}
          setIsAddingBounce={setIsAddingBounce}
          setIsPlacing={setIsPlacing}
          isPlacing={isPlacing}
          origin={origin}
          isAddingBounce={isAddingBounce}
          notice={notice}
          handleCancelPlacement={handleCancelPlacement}
          onEnterCoordinates={() => {
            setIsPlacing(false);
            setOrigin(null);
            setDraftWaypoints([]);
            setIsAddingBounce(false);
            setDraftLanding(null);
            setIsModalOpen(true);
          }}
        />

        <section
          aria-label={t('library.lineups.map')}
          className="grid min-h-[28rem] min-w-0 place-items-center overflow-hidden rounded-float border border-line bg-surface-1 lg:min-h-0 lg:[container-type:size] xl:absolute xl:inset-0"
        >
          <LineupPlate
            map={map}
            lineups={filteredLineups}
            focused={selectedIndex >= 0 ? selectedIndex : hoveredIndex >= 0 ? hoveredIndex : null}
            selectedIds={selectedLineupIds}
            mode={mode}
            selectedNodes={visibleSelectedNodes}
            onSelect={handleSelectMarker}
            onSelectNode={handleSelectNode}
            onPlacePoint={handlePlacePoint}
            isPlacing={isPlacing}
            isAddingBounce={isAddingBounce}
            onToggleAddBounce={() => setIsAddingBounce((prev) => !prev)}
            onCancelPlacement={handleCancelPlacement}
            draftOrigin={origin}
            draftWaypoints={draftWaypoints}
            onUpdatePoint={mode === 'edit' ? handleUpdateLineupPoint : undefined}
            onMergeSelected={
              mode === 'edit' && visibleSelectedNodes.length === 0 ? handleMergeSelected : undefined
            }
            onMergeLandings={
              mode === 'edit' && (visibleSelectedNodes.length === 0 || mergeTarget === 'landing')
                ? handleMergeLandings
                : undefined
            }
            onMergeOrigins={
              mode === 'edit' && (visibleSelectedNodes.length === 0 || mergeTarget === 'origin')
                ? handleMergeOrigins
                : undefined
            }
            onUnmergeLineup={mode === 'edit' ? handleUnmergeLineup : undefined}
            onAddBounceToLineup={mode === 'edit' ? handleAddBounceToLineup : undefined}
            onDeleteBounceFromLineup={mode === 'edit' ? handleDeleteBounceFromLineup : undefined}
            onEditLineup={
              mode === 'edit'
                ? (lineup) => {
                    setDetailLineup(null);
                    setEditingLineup(lineup);
                    setIsModalOpen(true);
                  }
                : undefined
            }
            onDeleteLineup={
              mode === 'edit'
                ? (id) => {
                    void deleteLineup(id).then(() => setSelectedId(null));
                  }
                : undefined
            }
            onDeleteSelected={mode === 'edit' ? handleDeleteSelected : undefined}
          />
        </section>

        <LineupsListSidebar
          filteredLineups={filteredLineups}
          hoveredIndex={hoveredIndex}
          selectedIndex={selectedIndex >= 0 ? selectedIndex : null}
          selectedIds={selectedLineupIds}
          mergeTarget={mergeTarget}
          mode={mode}
          search={search}
          setSearch={setSearch}
          setHoveredId={setHoveredId}
          setSelectedId={setSelectedId}
          setDetailLineup={setDetailLineup}
          handleToggleSelectId={handleToggleSelectId}
          handleMergeSelected={
            visibleSelectedNodes.length === 0 || mergeTarget !== undefined
              ? handleMergeSelected
              : undefined
          }
          handleUnmergeSelected={handleUnmergeSelected}
          handleDeleteSelected={handleDeleteSelected}
          handleClearSelection={handleClearSelection}
        />
      </div>

      <LineupVariantsDialog
        selectedVariants={selectedVariants}
        selectedGroup={selectedGroup}
        onDismiss={() => setSelectedVariants(null)}
        onSelectLineup={(lineup) => {
          setSelectedId(lineup.id);
          setDetailLineup(lineup);
        }}
      />

      <LineupsRecordDialogs
        mode={mode}
        detailLineup={detailLineup}
        setDetailLineup={setDetailLineup}
        isModalOpen={isModalOpen}
        editingLineup={editingLineup}
        setEditingLineup={setEditingLineup}
        setIsModalOpen={setIsModalOpen}
        origin={origin}
        draftLanding={draftLanding}
        draftWaypoints={draftWaypoints}
        map={map}
        editGrenadeKind={editGrenadeKind}
        dismissForm={dismissForm}
        deleteLineup={deleteLineup}
        setSelectedId={setSelectedId}
        reload={reload}
      />
    </div>
  );
}
