import {
  type Lineup,
  type LineupGroupTarget,
  THROWN_UTILITY_KINDS,
  UTILITY_NAMES,
  type UtilityKind,
} from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { findNearestCallout, MAP_IDS, type MapId } from '@disa/map-data';
import {
  Button,
  Dialog,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@disa/ui';
import { Download, Eye, Pencil, Plus, Search, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { filterLineups } from '../helpers/lineup-filter';
import {
  groupLineupsByLanding,
  groupLineupsByOrigin,
  type LineupHit,
  type LineupNode,
} from '../helpers/lineup-plot';
import { useMapLineups } from '../hooks/use-map-lineups';
import { LineupDetailModal } from './LineupDetailModal';
import { LineupFormModal } from './LineupFormModal';
import { LineupList } from './LineupList';
import { LineupPlate } from './LineupPlate';

type InteractionMode = 'view' | 'edit';
type SideScope = 'ALL' | 'CT' | 'T';
type KindScope = 'all' | UtilityKind;
type Point = { readonly x: number; readonly y: number };

interface SelectedVariants {
  readonly type: 'origin' | 'landing';
  readonly ids: readonly string[];
}

export function LineupsView() {
  const t = useT();
  const [mode, setMode] = useState<InteractionMode>('view');
  const [map, setMap] = useState<MapId>('de_mirage');
  const [side, setSide] = useState<SideScope>('ALL');
  const [kind, setKind] = useState<KindScope>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<readonly LineupNode[]>([]);
  const [editGrenadeKind, setEditGrenadeKind] = useState<UtilityKind>('smoke');
  const [origin, setOrigin] = useState<Point | null>(null);
  const [draftWaypoints, setDraftWaypoints] = useState<Point[]>([]);
  const [isAddingBounce, setIsAddingBounce] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [editingLineup, setEditingLineup] = useState<Lineup | null>(null);
  const [detailLineup, setDetailLineup] = useState<Lineup | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftLanding, setDraftLanding] = useState<Point | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariants | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lineups, reload, deleteLineup, importLineups, exportLineups } = useMapLineups(map);

  const filteredLineups = useMemo(
    () => filterLineups(lineups, { side, kind, search }),
    [lineups, side, kind, search],
  );
  const selectedIndex = filteredLineups.findIndex((lineup) => lineup.id === selectedId);
  const originGroups = useMemo(() => groupLineupsByOrigin(filteredLineups), [filteredLineups]);
  const landingGroups = useMemo(() => groupLineupsByLanding(filteredLineups), [filteredLineups]);
  const selectedGroup =
    selectedVariants?.ids.flatMap((id) => filteredLineups.filter((item) => item.id === id)) ?? [];

  const handleToggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSelectMarker = (hit: LineupHit | null, modifierKey?: boolean) => {
    if (hit === null) {
      if (!modifierKey) {
        setSelectedId(null);
      }
      return;
    }
    const single = filteredLineups[hit.index];
    if (single === undefined) return;

    if (mode === 'edit') {
      if (modifierKey) {
        handleToggleSelectId(single.id);
      } else {
        setSelectedId(single.id);
        setSelectedIds(new Set());
      }
      return;
    }

    // View mode: open detail or variants
    if (modifierKey) {
      handleToggleSelectId(single.id);
      return;
    }

    const { index, target } = hit;
    const targetGroups = target === 'landing' ? landingGroups : originGroups;
    const group = targetGroups.find(({ indices }) => indices.includes(index));

    if (group !== undefined && group.indices.length > 1) {
      setSelectedVariants({
        type: target,
        ids: group.indices.flatMap((position) => {
          const lineup = filteredLineups[position];
          return lineup === undefined ? [] : [lineup.id];
        }),
      });
      return;
    }

    setSelectedId(single.id);
    setDetailLineup(single);
  };

  const handleSelectNode = (node: LineupNode | null, modifierKey?: boolean) => {
    if (node === null) {
      if (!modifierKey) {
        setSelectedNodes([]);
        setSelectedId(null);
      }
      return;
    }

    const lineup = filteredLineups[node.lineupIndex];
    if (lineup === undefined) return;
    setSelectedId(lineup.id);

    if (modifierKey) {
      setSelectedNodes((prev) => {
        const exists = prev.some(
          (n) =>
            n.lineupIndex === node.lineupIndex &&
            n.target === node.target &&
            n.waypointIndex === node.waypointIndex,
        );
        if (exists) {
          return prev.filter(
            (n) =>
              n.lineupIndex !== node.lineupIndex ||
              n.target !== node.target ||
              n.waypointIndex !== node.waypointIndex,
          );
        }
        return [...prev, node];
      });
    } else {
      setSelectedNodes([node]);
    }
  };

  const handlePlacePoint = (point: Point, isBounce?: boolean) => {
    if (origin === null) {
      setOrigin(point);
      return;
    }
    if (isBounce) {
      setDraftWaypoints((prev) => [...prev, point]);
      setIsAddingBounce(false);
      return;
    }
    setDraftLanding(point);
    setIsPlacing(false);
    setIsModalOpen(true);
  };

  const handleCancelPlacement = () => {
    setIsPlacing(false);
    setOrigin(null);
    setDraftWaypoints([]);
    setIsAddingBounce(false);
    setDraftLanding(null);
  };

  const dismissForm = () => {
    setIsModalOpen(false);
    setEditingLineup(null);
    setOrigin(null);
    setDraftWaypoints([]);
    setIsAddingBounce(false);
    setDraftLanding(null);
  };

  const handleMergeByTarget = async (groupTarget: LineupGroupTarget) => {
    const toMerge = filteredLineups.filter((l) => selectedIds.has(l.id));
    if (toMerge.length < 2) return;

    const first = toMerge[0];
    if (first === undefined) return;

    const targetPoint = groupTarget === 'landing' ? first.landing : first.origin;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const updated = toMerge.map((item) => ({
      ...item,
      groupId,
      groupTarget,
      landing: groupTarget === 'landing' ? targetPoint : item.landing,
      origin: groupTarget === 'origin' ? targetPoint : item.origin,
      isBuiltIn: false,
    }));

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.putMany(updated);
      } finally {
        store.close();
      }
      setSelectedIds(new Set());
      setSelectedNodes([]);
      await reload();
      setNotice(t('library.lineups.mergeSelected', { count: updated.length }));
    }
  };

  const handleMergeLandings = () => void handleMergeByTarget('landing');
  const handleMergeOrigins = () => void handleMergeByTarget('origin');

  const handleMergeSelected = async () => {
    const toMerge = filteredLineups.filter((l) => selectedIds.has(l.id));
    if (toMerge.length < 2) return;

    const firstLanding = toMerge[0]?.landing ?? { x: 0, y: 0, z: 0 };
    const firstOrigin = toMerge[0]?.origin ?? { x: 0, y: 0, z: 0 };
    let landingDiffSum = 0;
    let originDiffSum = 0;
    for (const item of toMerge) {
      landingDiffSum += Math.hypot(
        item.landing.x - firstLanding.x,
        item.landing.y - firstLanding.y,
      );
      originDiffSum += Math.hypot(item.origin.x - firstOrigin.x, item.origin.y - firstOrigin.y);
    }
    const groupTarget: LineupGroupTarget = landingDiffSum <= originDiffSum ? 'landing' : 'origin';
    const targetPoint = groupTarget === 'landing' ? firstLanding : firstOrigin;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const updated = toMerge.map((item) => ({
      ...item,
      groupId,
      groupTarget,
      landing: groupTarget === 'landing' ? targetPoint : item.landing,
      origin: groupTarget === 'origin' ? targetPoint : item.origin,
      isBuiltIn: false,
    }));

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.putMany(updated);
      } finally {
        store.close();
      }
      setSelectedIds(new Set());
      setSelectedNodes([]);
      await reload();
      setNotice(t('library.lineups.mergeSelected', { count: updated.length }));
    }
  };

  const handleDeleteSelected = async () => {
    const customLineupsToDelete = lineups.filter(
      (item) => selectedIds.has(item.id) && !item.isBuiltIn,
    );
    if (customLineupsToDelete.length === 0) return;
    if (
      !window.confirm(
        t('library.lineups.deleteSelectedConfirm', { count: customLineupsToDelete.length }),
      )
    ) {
      return;
    }

    for (const item of customLineupsToDelete) {
      await deleteLineup(item.id);
    }
    setSelectedIds(new Set());
    setSelectedNodes([]);
    setSelectedId(null);
  };

  const handleUnmergeLineup = async (lineupId: string) => {
    const lineup = lineups.find((item) => item.id === lineupId);
    if (!lineup?.groupId) return;

    const inGroup = lineups.filter((item) => item.groupId === lineup.groupId);
    const updated: Lineup[] = inGroup.map((item) => {
      const { groupId: _g, groupTarget: _gt, ...rest } = item;
      return {
        ...rest,
        isBuiltIn: false,
      };
    });

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.putMany(updated);
      } finally {
        store.close();
      }
      await reload();
      setNotice(t('library.lineups.unmerge'));
    }
  };

  const handleUnmergeSelected = async () => {
    const inSelection = lineups.filter((item) => selectedIds.has(item.id) && item.groupId);
    if (inSelection.length === 0) return;

    const groupIds = new Set(inSelection.map((item) => item.groupId));
    const allInGroups = lineups.filter((item) => item.groupId && groupIds.has(item.groupId));
    const updated: Lineup[] = allInGroups.map((item) => {
      const { groupId: _g, groupTarget: _gt, ...rest } = item;
      return {
        ...rest,
        isBuiltIn: false,
      };
    });

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.putMany(updated);
      } finally {
        store.close();
      }
      setSelectedIds(new Set());
      await reload();
      setNotice(t('library.lineups.unmerge'));
    }
  };

  const handleUpdateLineupPoint = async (
    lineupId: string,
    target: 'origin' | 'landing' | 'waypoint',
    point: Point,
    waypointIndex?: number,
  ) => {
    const lineup = lineups.find((item) => item.id === lineupId);
    if (!lineup) return;

    let updatedLineup: Lineup;
    if (target === 'origin') {
      updatedLineup = {
        ...lineup,
        origin: { ...lineup.origin, x: point.x, y: point.y },
        isBuiltIn: false,
      };
    } else if (target === 'landing') {
      const newCallout = findNearestCallout(map, point) ?? lineup.targetCallout;
      updatedLineup = {
        ...lineup,
        landing: { ...lineup.landing, x: point.x, y: point.y },
        ...(newCallout ? { targetCallout: newCallout } : {}),
        isBuiltIn: false,
      };
    } else if (target === 'waypoint' && waypointIndex !== undefined) {
      const waypoints = [...(lineup.waypoints ?? [])];
      const current = waypoints[waypointIndex];
      if (current) {
        waypoints[waypointIndex] = { ...current, x: point.x, y: point.y };
        updatedLineup = {
          ...lineup,
          waypoints,
          isBuiltIn: false,
        };
      } else {
        return;
      }
    } else {
      return;
    }

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.put(updatedLineup);
      } finally {
        store.close();
      }
      await reload();
      setNotice(t('library.lineups.positionUpdated'));
    }
  };

  const handleAddBounceToLineup = async (lineupId: string) => {
    const lineup = lineups.find((item) => item.id === lineupId);
    if (!lineup) return;

    const waypoints = [...(lineup.waypoints ?? [])];
    const prev = waypoints.length > 0 ? waypoints[waypoints.length - 1] : lineup.origin;
    const newWp = {
      x: ((prev?.x ?? lineup.origin.x) + lineup.landing.x) / 2,
      y: ((prev?.y ?? lineup.origin.y) + lineup.landing.y) / 2,
      z: 0,
    };
    waypoints.push(newWp);
    const updated: Lineup = {
      ...lineup,
      waypoints,
      isBuiltIn: false,
    };

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.put(updated);
      } finally {
        store.close();
      }
      await reload();
      setSelectedId(updated.id);
    }
  };

  const handleDeleteBounceFromLineup = async (lineupId: string, waypointIndex: number) => {
    const lineup = lineups.find((item) => item.id === lineupId);
    if (!lineup?.waypoints) return;

    const waypoints = lineup.waypoints.filter((_, idx) => idx !== waypointIndex);
    const updated: Lineup = {
      ...lineup,
      waypoints,
      isBuiltIn: false,
    };

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.put(updated);
      } finally {
        store.close();
      }
      await reload();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const count = await importLineups(file);
      setNotice(t('library.lineups.importSuccess', { count }));
    } catch {
      setNotice(t('library.lineups.importError'));
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-3 lg:h-full lg:min-h-0">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="font-ui font-medium text-[clamp(2rem,3vw,3rem)] tracking-[-0.045em] text-ink leading-[1.05]">
              <Text path="library.lineups.title" />
            </h2>
            <span className="numeric font-mono text-11 text-ink-dim">
              <Text path="library.lineups.count" values={{ count: filteredLineups.length }} />
            </span>
          </div>
          <p className="text-13 text-ink-dim leading-prose">
            <Text path="library.lineups.note" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <div className="flex items-center rounded-card border border-line bg-surface-1 p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('view');
                setIsPlacing(false);
                setOrigin(null);
                setDraftWaypoints([]);
                setIsAddingBounce(false);
                setSelectedNodes([]);
              }}
              className={`flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-11 font-medium ${mode === 'view' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'}`}
            >
              <Eye className="size-3.5" />
              <Text path="library.lineups.viewMode" />
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-11 font-medium ${mode === 'edit' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'}`}
            >
              <Pencil className="size-3.5" />
              <Text path="library.lineups.editMode" />
            </button>
          </div>
          {mode === 'edit' && (
            <Button
              onClick={() => {
                setIsPlacing(true);
                setOrigin(null);
                setDraftWaypoints([]);
                setIsAddingBounce(false);
                setSelectedId(null);
                setSelectedNodes([]);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              <Text path="library.lineups.create" />
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="size-3.5" />
            <Text path="library.lineups.import" />
          </Button>
          <Button variant="secondary" onClick={() => void exportLineups()} className="gap-1.5">
            <Download className="size-3.5" />
            <Text path="library.lineups.export" />
          </Button>
        </div>
      </header>

      <div className="relative grid min-h-[36rem] min-w-0 grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(11rem,13rem)_minmax(0,1fr)_minmax(16rem,20rem)] xl:block">
        <aside className="surface-card z-10 flex min-w-0 flex-col gap-4 rounded-float p-3 lg:min-h-0 lg:overflow-y-auto xl:absolute xl:inset-y-3 xl:left-3 xl:w-[14rem]">
          <div className="flex flex-col gap-2">
            <span className="label-dense text-ink-dim">
              <Text path="library.lineups.map" />
            </span>
            <Select
              value={map}
              onValueChange={(val) => {
                if (!val) return;
                setMap(val as MapId);
                setSelectedId(null);
                setSelectedIds(new Set());
                setOrigin(null);
                setDraftWaypoints([]);
                setIsAddingBounce(false);
                setIsPlacing(false);
              }}
            >
              <SelectTrigger
                aria-label={t('library.lineups.map')}
                className="h-8 w-full bg-surface-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAP_IDS.map((mapId) => (
                  <SelectItem key={mapId} value={mapId}>
                    {mapId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset
            aria-label={t('library.lineups.side')}
            className="m-0 flex flex-col gap-2 border-none p-0"
          >
            <legend className="label-dense text-ink-dim">
              <Text path="library.lineups.side" />
            </legend>
            <div className="flex items-center gap-1">
              {(['ALL', 'CT', 'T'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSide(option);
                    setSelectedId(null);
                  }}
                  className={`flex-1 rounded-chip px-2.5 py-1.5 text-11 ${side === option ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2'}`}
                >
                  {option === 'ALL' ? <Text path="library.lineups.bothSides" /> : option}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="label-dense text-ink-dim">
              <Text path="library.lineups.form.kind" />
            </span>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  setKind('all');
                  setSelectedId(null);
                }}
                className={`rounded-card px-3 py-2 text-left text-12 ${kind === 'all' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
              >
                <Text path="library.lineups.allKinds" />
              </button>
              {THROWN_UTILITY_KINDS.map((utilityKind) => (
                <button
                  key={utilityKind}
                  type="button"
                  onClick={() => {
                    setKind(utilityKind);
                    setSelectedId(null);
                  }}
                  aria-label={UTILITY_NAMES[utilityKind]}
                  className={`flex items-center gap-2 rounded-card px-3 py-2 text-left text-12 ${kind === utilityKind ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
                >
                  <UtilityGlyph
                    kind={utilityKind}
                    label={UTILITY_NAMES[utilityKind]}
                    size="control"
                  />
                  <span>{UTILITY_NAMES[utilityKind]}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'edit' && (
            <div className="flex flex-col gap-2">
              <span className="label-dense text-ink-dim">
                <Text path="library.lineups.grenadeKind" />
              </span>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                {THROWN_UTILITY_KINDS.map((utilityKind) => (
                  <button
                    key={utilityKind}
                    type="button"
                    onClick={() => setEditGrenadeKind(utilityKind)}
                    aria-label={UTILITY_NAMES[utilityKind]}
                    className={`flex items-center gap-2 rounded-card px-3 py-2 text-left text-12 ${editGrenadeKind === utilityKind ? 'bg-primary/15 text-ink ring-1 ring-primary/40' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
                  >
                    <UtilityGlyph
                      kind={utilityKind}
                      label={UTILITY_NAMES[utilityKind]}
                      size="control"
                    />
                    <span>{UTILITY_NAMES[utilityKind]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            role="status"
            className="rounded-card border border-line bg-surface-2 p-2.5 text-11 text-ink-dim"
          >
            <Text
              path={
                mode === 'edit' ? 'library.lineups.editModeHint' : 'library.lineups.viewModeHint'
              }
            />
          </div>

          {notice && (
            <div
              role="status"
              className="rounded-card border border-line bg-surface-2 p-2.5 text-12 text-ink"
            >
              {notice}
            </div>
          )}

          {isPlacing && (
            <div
              role="status"
              className="flex flex-col gap-2 rounded-card border border-primary/40 bg-surface-2 p-3 text-12 text-ink"
            >
              <Text
                path={
                  origin === null
                    ? 'library.lineups.placeOrigin'
                    : isAddingBounce
                      ? 'library.lineups.placeBouncePrompt'
                      : 'library.lineups.placeLanding'
                }
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlacing(false);
                    setOrigin(null);
                    setDraftWaypoints([]);
                    setIsAddingBounce(false);
                    setDraftLanding(null);
                    setIsModalOpen(true);
                  }}
                  className="text-left text-11 text-ink-dim underline hover:text-ink"
                >
                  <Text path="library.lineups.enterCoordinates" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelPlacement}
                  aria-label={t('library.lineups.form.cancel')}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}
        </aside>

        <section
          aria-label={t('library.lineups.map')}
          className="grid min-h-[28rem] min-w-0 place-items-center overflow-hidden rounded-float border border-line bg-surface-1 lg:min-h-0 lg:[container-type:size] xl:absolute xl:inset-0"
        >
          <LineupPlate
            map={map}
            lineups={filteredLineups}
            focused={selectedIndex >= 0 ? selectedIndex : hoveredIndex}
            selectedIds={selectedIds}
            mode={mode}
            selectedNodes={selectedNodes}
            onSelect={handleSelectMarker}
            onSelectNode={handleSelectNode}
            onPlacePoint={handlePlacePoint}
            isPlacing={isPlacing}
            isAddingBounce={isAddingBounce}
            onToggleAddBounce={() => setIsAddingBounce((prev) => !prev)}
            onCancelPlacement={handleCancelPlacement}
            draftOrigin={origin}
            draftWaypoints={draftWaypoints}
            onUpdatePoint={handleUpdateLineupPoint}
            onMergeSelected={handleMergeSelected}
            onMergeLandings={handleMergeLandings}
            onMergeOrigins={handleMergeOrigins}
            onUnmergeLineup={handleUnmergeLineup}
            onAddBounceToLineup={handleAddBounceToLineup}
            onDeleteBounceFromLineup={handleDeleteBounceFromLineup}
            onEditLineup={(lineup) => {
              setDetailLineup(null);
              setEditingLineup(lineup);
              setIsModalOpen(true);
            }}
            onDeleteLineup={(id) => {
              void deleteLineup(id).then(() => setSelectedId(null));
            }}
            onDeleteSelected={handleDeleteSelected}
          />
        </section>

        <aside
          aria-label={t('library.lineups.title')}
          className="surface-card z-10 flex min-w-0 flex-col gap-2.5 rounded-float p-3 lg:min-h-0 lg:overflow-hidden xl:absolute xl:inset-y-3 xl:right-3 xl:w-[21rem]"
        >
          <div className="flex items-center justify-between">
            <span className="font-ui text-13 font-medium text-ink">
              <Text path="library.lineups.title" />
            </span>
            <div className="flex items-center rounded-card border border-line bg-surface-1 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode('view');
                  setIsPlacing(false);
                  setOrigin(null);
                  setDraftWaypoints([]);
                  setIsAddingBounce(false);
                  setSelectedNodes([]);
                }}
                className={`flex items-center gap-1.5 rounded-chip px-2 py-1 text-11 font-medium ${mode === 'view' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'}`}
              >
                <Eye className="size-3.5" />
                <Text path="library.lineups.viewMode" />
              </button>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`flex items-center gap-1.5 rounded-chip px-2 py-1 text-11 font-medium ${mode === 'edit' ? 'bg-primary/20 text-primary font-semibold' : 'text-ink-dim hover:text-ink'}`}
              >
                <Pencil className="size-3.5" />
                <Text path="library.lineups.editMode" />
              </button>
            </div>
          </div>

          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-ink-dim" />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedId(null);
              }}
              aria-label={t('library.lineups.searchPlaceholder')}
              placeholder={t('library.lineups.searchPlaceholder')}
              className="h-8 pl-8 pr-2 text-12"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <LineupList
              lineups={filteredLineups}
              focused={hoveredIndex}
              selectedIndex={selectedIndex >= 0 ? selectedIndex : null}
              selectedIds={selectedIds}
              onHover={setHoveredIndex}
              onSelect={(index) => {
                const item = filteredLineups[index];
                if (item) {
                  setSelectedId(item.id);
                  setDetailLineup(item);
                }
              }}
              onToggleSelectId={handleToggleSelectId}
              onMergeSelected={handleMergeSelected}
              onUnmergeSelected={handleUnmergeSelected}
              onDeleteSelected={handleDeleteSelected}
              onClearSelection={handleClearSelection}
              onContextMenu={(_e, lineup) => {
                setSelectedId(lineup.id);
                setDetailLineup(lineup);
              }}
            />
          </div>
        </aside>
      </div>

      {/* Variants Modal (Cluster on Map) */}
      {selectedVariants !== null && (
        <Dialog
          isOpen
          onDismiss={() => setSelectedVariants(null)}
          className="w-full max-w-[36rem] p-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-ui text-16 font-medium text-ink">
              {selectedVariants.type === 'origin' ? (
                <Text
                  path="library.lineups.fromPosition"
                  values={{ count: selectedGroup.length }}
                />
              ) : (
                <Text path="library.lineups.toPosition" values={{ count: selectedGroup.length }} />
              )}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedVariants(null)}
              aria-label={t('library.lineups.form.close')}
              className="rounded-chip p-1 text-ink-dim hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto">
            {selectedGroup.map((lineup) => {
              const preview =
                lineup.imageUrls?.[0] ??
                (/\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(lineup.mediaUrl ?? '')
                  ? lineup.mediaUrl
                  : undefined);
              return (
                <button
                  key={lineup.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(lineup.id);
                    setSelectedVariants(null);
                    setDetailLineup(lineup);
                  }}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-2 text-left transition-colors hover:bg-surface-2"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-16 shrink-0 rounded-chip object-cover"
                    />
                  ) : (
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-chip bg-surface-2">
                      <UtilityGlyph
                        kind={lineup.kind}
                        label={UTILITY_NAMES[lineup.kind]}
                        size="control"
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-13 font-medium text-ink">{lineup.title}</span>
                    <span className="text-11 text-ink-dim">{UTILITY_NAMES[lineup.kind]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Dialog>
      )}

      {/* Grenade Detail Modal */}
      {detailLineup !== null && (
        <LineupDetailModal
          isOpen
          lineup={detailLineup}
          onDismiss={() => setDetailLineup(null)}
          onEdit={(lineup) => {
            setDetailLineup(null);
            setEditingLineup(lineup);
            setIsModalOpen(true);
          }}
          onDelete={(id) => {
            setDetailLineup(null);
            void deleteLineup(id).then(() => setSelectedId(null));
          }}
        />
      )}

      {/* Creation/Edit Form Modal */}
      {isModalOpen && (
        <LineupFormModal
          isOpen
          onDismiss={dismissForm}
          initialData={
            editingLineup ??
            (origin && draftLanding
              ? {
                  origin: { ...origin, z: 0 },
                  landing: { ...draftLanding, z: 0 },
                  waypoints: draftWaypoints.map((wp) => ({ ...wp, z: 0 })),
                  map,
                  kind: editGrenadeKind,
                }
              : {
                  map,
                  kind: editGrenadeKind,
                })
          }
          defaultMap={map}
          onSaved={(lineup) => {
            setSelectedId(lineup.id);
            void reload();
          }}
        />
      )}
    </div>
  );
}
