import type { Lineup, LineupGroupTarget } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { useT } from '@disa/i18n';
import type { SelectedLineupNode } from '../helpers/lineup-nodes';

export function useLineupGroupActions({
  lineups,
  filteredLineups,
  selectedIds,
  mergeTarget,
  setSelectedIds,
  setSelectedNodes,
  setSelectedId,
  setNotice,
  reload,
  deleteLineup,
}: {
  readonly lineups: readonly Lineup[];
  readonly filteredLineups: readonly Lineup[];
  readonly selectedIds: ReadonlySet<string>;
  readonly mergeTarget: 'origin' | 'landing' | undefined;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly setSelectedNodes: React.Dispatch<React.SetStateAction<readonly SelectedLineupNode[]>>;
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setNotice: (notice: string | null) => void;
  readonly reload: () => Promise<void>;
  readonly deleteLineup: (id: string) => Promise<void>;
}) {
  const t = useT();
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
      setNotice(t('library.lineups.mergedNotice', { count: updated.length }));
    }
  };

  const handleMergeLandings = () => void handleMergeByTarget('landing');
  const handleMergeOrigins = () => void handleMergeByTarget('origin');

  const handleMergeSelected = async () => {
    if (mergeTarget !== undefined) {
      await handleMergeByTarget(mergeTarget);
      return;
    }
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
    await handleMergeByTarget(groupTarget);
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
      setNotice(t('library.lineups.separatedNotice'));
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
      setNotice(t('library.lineups.separatedNotice'));
    }
  };

  return {
    handleMergeLandings,
    handleMergeOrigins,
    handleMergeSelected,
    handleDeleteSelected,
    handleUnmergeLineup,
    handleUnmergeSelected,
  };
}
