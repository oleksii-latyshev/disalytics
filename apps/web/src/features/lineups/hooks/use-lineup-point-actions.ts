import type { Lineup } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { useT } from '@disa/i18n';
import { findNearestCallout, type MapId } from '@disa/map-data';
import type { SelectedLineupNode } from '../helpers/lineup-layer';
import { updateLineupsAtPoint } from '../helpers/update-lineup-point';

export type LineupPoint = { readonly x: number; readonly y: number };

export function useLineupPointActions({
  lineups,
  map,
  reload,
  setNotice,
  setSelectedId,
  setSelectedNodes,
}: {
  readonly lineups: readonly Lineup[];
  readonly map: MapId;
  readonly reload: () => Promise<void>;
  readonly setNotice: (notice: string | null) => void;
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSelectedNodes: React.Dispatch<React.SetStateAction<readonly SelectedLineupNode[]>>;
}) {
  const t = useT();
  const handleUpdateLineupPoint = async (
    lineupId: string,
    target: 'origin' | 'landing' | 'waypoint',
    point: LineupPoint,
    waypointIndex?: number,
  ) => {
    const updatedLineups = updateLineupsAtPoint({
      lineups,
      lineupId,
      target,
      point,
      ...(waypointIndex === undefined ? {} : { waypointIndex }),
      resolveCallout: (landing) => findNearestCallout(map, landing),
    });
    if (updatedLineups === undefined) return;

    const store = await openLineupStore();
    if (store !== null) {
      try {
        await store.putMany(updatedLineups);
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
      setSelectedNodes((prev) =>
        prev.flatMap((node) => {
          if (node.lineupId !== lineupId || node.target !== 'waypoint') return [node];
          if (node.waypointIndex === waypointIndex) return [];
          return [
            node.waypointIndex !== undefined && node.waypointIndex > waypointIndex
              ? { ...node, waypointIndex: node.waypointIndex - 1 }
              : node,
          ];
        }),
      );
    }
  };

  return { handleUpdateLineupPoint, handleAddBounceToLineup, handleDeleteBounceFromLineup };
}
