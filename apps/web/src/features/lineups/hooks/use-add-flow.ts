import type { Lineup, WorldPoint } from '@disa/demo-core';
import { useState } from 'react';
import {
  type AddDraft,
  joinPlan,
  newLineup,
  placePoint,
  redoPoint,
  startAdd,
  startAnother,
} from '../helpers/lineup-add';
import { newGroupId, newLineupId } from '../helpers/lineup-ids';
import type { KindScope, SideScope } from '../helpers/lineup-scope';
import type { SavedTarget } from '../helpers/lineup-targets';
import { persistLineups, storePreparedPhotos } from '../helpers/persist-lineup';
import type { PreparedImage } from '../helpers/prepared-image';

interface Options {
  map: string;
  reload: () => Promise<void>;
  /** A lineup was saved; `id` is the one that was added. */
  onSaved: (id: string) => void;
}

/**
 * The guided add: a draft that is placed on the map one point at a time, filled in, and saved —
 * with its photos, and into the group of the target it is another position for.
 */
export function useAddFlow({ map, reload, onSaved }: Options) {
  const [draft, setDraft] = useState<AddDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const begin = (next: AddDraft) => {
    setHasFailed(false);
    setDraft(next);
  };

  const save = async (photos: readonly PreparedImage[]) => {
    if (draft === null || isSaving) return;

    setIsSaving(true);
    setHasFailed(false);
    const refs = photos.length === 0 ? [] : await storePreparedPhotos(photos);
    const plan = draft.target === null ? null : joinPlan(draft.target, newGroupId());
    const lineup: Lineup | null =
      refs === null
        ? null
        : newLineup({
            map,
            draft,
            imageUrls: refs,
            id: newLineupId(),
            now: Date.now(),
            groupId: plan?.groupId,
          });
    const isStored =
      lineup !== null && (await persistLineups([lineup, ...(plan?.regrouped ?? [])]));
    setIsSaving(false);

    if (lineup === null || !isStored) {
      setHasFailed(true);
      return;
    }

    await reload();
    setDraft(null);
    onSaved(lineup.id);
  };

  return {
    draft,
    isSaving,
    hasFailed,
    start: (kind: KindScope, side: SideScope) => begin(startAdd(kind, side)),
    startAnother: (target: SavedTarget, side: Lineup['side']) => begin(startAnother(target, side)),
    update: (patch: Partial<AddDraft>) =>
      setDraft((current) => (current === null ? null : { ...current, ...patch })),
    place: (point: WorldPoint) =>
      setDraft((current) => (current === null ? null : placePoint(current, point))),
    redo: (point: 'landing' | 'origin') =>
      setDraft((current) => (current === null ? null : redoPoint(current, point))),
    cancel: () => setDraft(null),
    save,
  };
}
