import type { Lineup, UtilityKind } from '@disa/demo-core';
import type { MapId } from '@disa/map-data';
import { LineupDetailModal } from './LineupDetailModal';
import { LineupFormModal } from './LineupFormModal';

export function LineupsRecordDialogs({
  mode,
  detailLineup,
  setDetailLineup,
  isModalOpen,
  editingLineup,
  setEditingLineup,
  setIsModalOpen,
  origin,
  draftLanding,
  draftWaypoints,
  map,
  editGrenadeKind,
  dismissForm,
  deleteLineup,
  setSelectedId,
  reload,
}: {
  readonly mode: 'view' | 'edit';
  readonly detailLineup: Lineup | null;
  readonly setDetailLineup: React.Dispatch<React.SetStateAction<Lineup | null>>;
  readonly isModalOpen: boolean;
  readonly editingLineup: Lineup | null;
  readonly setEditingLineup: React.Dispatch<React.SetStateAction<Lineup | null>>;
  readonly setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly origin: { readonly x: number; readonly y: number } | null;
  readonly draftLanding: { readonly x: number; readonly y: number } | null;
  readonly draftWaypoints: readonly { readonly x: number; readonly y: number }[];
  readonly map: MapId;
  readonly editGrenadeKind: UtilityKind;
  readonly dismissForm: () => void;
  readonly deleteLineup: (id: string) => Promise<void>;
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly reload: () => Promise<void>;
}) {
  return (
    <>
      {detailLineup !== null && (
        <LineupDetailModal
          isOpen
          lineup={detailLineup}
          onDismiss={() => setDetailLineup(null)}
          onEdit={
            mode === 'edit'
              ? (lineup) => {
                  setDetailLineup(null);
                  setEditingLineup(lineup);
                  setIsModalOpen(true);
                }
              : undefined
          }
          onDelete={
            mode === 'edit'
              ? (id) => {
                  setDetailLineup(null);
                  void deleteLineup(id).then(() => setSelectedId(null));
                }
              : undefined
          }
        />
      )}

      {mode === 'edit' && isModalOpen && (
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
    </>
  );
}
